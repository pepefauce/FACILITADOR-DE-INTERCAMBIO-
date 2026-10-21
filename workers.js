// Direcciones de contratos en Binance Smart Chain Mainnet (Chain ID 56)
const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap V2 Router
const BSC_RPC_URL = "https://bsc-dataseed.binance.org/";

const TOKENS = {
  BNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",  // WBNB
  USDT: "0x55d398326f99059fF775485246999027B3197955", // USDT BEP-20
  PEPE: "0x25d886376D35E382724846a3Ae19f6A257746B52", // PEPE
  CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cce5"  // CAKE
};

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Facilitador de Intercambio - Worker Operativo", { headers: corsHeaders });
    }

    try {
      const { tokenIn, tokenOut, amountIn } = await request.json();

      if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
        return new Response(JSON.stringify({ success: false, error: "Datos de entrada inválidos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const addrIn = TOKENS[tokenIn] || tokenIn;
      const addrOut = TOKENS[tokenOut] || tokenOut;

      // Selector de función `getAmountsOut(uint256,address[])`: 0xd0679d29
      const amountHex = "0x" + BigInt(Math.floor(parseFloat(amountIn) * 1e18)).toString(16);
      
      // Construir payload ABI codificado manualmente para el RPC de BSC
      const path = [addrIn, addrOut];
      const encodedData = "0xd0679d29" + 
        amountHex.slice(2).padStart(64, "0") + 
        "0000000000000000000000000000000000000000000000000000000000000040" + 
        "0000000000000000000000000000000000000000000000000000000000000002" + 
        addrIn.slice(2).toLowerCase().padStart(64, "0") + 
        addrOut.slice(2).toLowerCase().padStart(64, "0");

      const rpcResponse = await fetch(BSC_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: ROUTER_ADDRESS, data: encodedData }, "latest"]
        })
      });

      const rpcResult = await rpcResponse.json();

      if (rpcResult.error) {
        throw new Error(rpcResult.error.message || "Error al consultar la blockchain");
      }

      // Decodificar respuesta de la blockchain
      const rawHex = rpcResult.result.slice(2);
      const amountOutHex = rawHex.slice(128, 192);
      const rawAmountOut = BigInt("0x" + amountOutHex);
      const estimatedOut = (Number(rawAmountOut) / 1e18).toFixed(6);
      const rate = (parseFloat(estimatedOut) / parseFloat(amountIn)).toFixed(6);

      return new Response(JSON.stringify({
        success: true,
        tokenIn,
        tokenOut,
        amountIn,
        estimatedOut,
        rate,
        router: "PancakeSwap V2 Router (BSC)",
        gasEstimate: "0.0008 BNB"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
