#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_DIR="$SCRIPT_DIR/node-server"
GO_DIR="$SCRIPT_DIR/go-server"

cleanup() {
  [ -n "${NODE_PID:-}" ] && kill "$NODE_PID" 2>/dev/null || true
  [ -n "${GO_PID:-}" ] && kill "$GO_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT

if [ ! -d "$NODE_DIR/gen" ] || [ ! -d "$GO_DIR/gen" ]; then
  echo "Generated code not found. Run 'node generate.js' first."
  exit 1
fi

get_rss_kb() {
  ps -o rss= -p "$1" 2>/dev/null | tr -d ' '
}

now_ms() {
  python3 -c 'import time; print(int(time.time() * 1000))'
}

wait_for_server() {
  local url="$1" max_wait="$2" elapsed=0
  while ! curl -sf "$url" >/dev/null 2>&1; do
    sleep 0.05
    elapsed=$((elapsed + 1))
    if [ "$elapsed" -ge "$((max_wait * 20))" ]; then
      echo "Server at $url did not start within ${max_wait}s"
      return 1
    fi
  done
}

echo "=== Memory Demo: Node.js vs Go ==="
echo "    ~1,000,000 lines of loaded code per server"
echo

# --- Go: build ---
echo "Building Go server (this may take a minute)..."
build_start=$(date +%s)
(cd "$GO_DIR" && go build -o server .)
build_end=$(date +%s)
echo "  Go build: $((build_end - build_start))s"

GO_BINARY_SIZE=$(stat -f%z "$GO_DIR/server" 2>/dev/null || stat -c%s "$GO_DIR/server" 2>/dev/null)
GO_BINARY_MB=$((GO_BINARY_SIZE / 1024 / 1024))
echo "  Go binary: ${GO_BINARY_MB} MB"
echo

# --- Node.js ---
echo "Starting Node.js server..."
NODE_START=$(now_ms)
node "$NODE_DIR/server.js" &
NODE_PID=$!
wait_for_server "http://localhost:3001/health" 120
NODE_READY=$(now_ms)
NODE_STARTUP_MS=$((NODE_READY - NODE_START))
curl -sf http://localhost:3001/health >/dev/null
sleep 2

NODE_RSS=$(get_rss_kb "$NODE_PID")
NODE_RSS_MB=$((NODE_RSS / 1024))
echo "  Node.js startup: ${NODE_STARTUP_MS} ms"
echo "  Node.js RSS:     ${NODE_RSS_MB} MB (${NODE_RSS} KB)"

kill "$NODE_PID" 2>/dev/null; wait "$NODE_PID" 2>/dev/null || true
unset NODE_PID
echo

# --- Go ---
echo "Starting Go server..."
GO_START=$(now_ms)
"$GO_DIR/server" &
GO_PID=$!
wait_for_server "http://localhost:3002/health" 10
GO_READY=$(now_ms)
GO_STARTUP_MS=$((GO_READY - GO_START))
curl -sf http://localhost:3002/health >/dev/null
sleep 2

GO_RSS=$(get_rss_kb "$GO_PID")
GO_RSS_MB=$((GO_RSS / 1024))
echo "  Go startup: ${GO_STARTUP_MS} ms"
echo "  Go RSS:     ${GO_RSS_MB} MB (${GO_RSS} KB)"

kill "$GO_PID" 2>/dev/null; wait "$GO_PID" 2>/dev/null || true
unset GO_PID
echo

# --- Summary ---
MEMORY_RATIO=$(echo "scale=1; $NODE_RSS_MB / $GO_RSS_MB" | bc)
STARTUP_RATIO=$(echo "scale=1; $NODE_STARTUP_MS / $GO_STARTUP_MS" | bc)

echo "=== Results ==="
echo ""
echo "| Platform   | RSS (MB) | Startup (ms) |"
echo "|------------|----------|--------------|"
printf "| Node.js    | %8d | %12d |\n" "$NODE_RSS_MB" "$NODE_STARTUP_MS"
printf "| Go         | %8d | %12d |\n" "$GO_RSS_MB" "$GO_STARTUP_MS"
printf "| **Difference** | %5s | %9s |\n" "${MEMORY_RATIO}x" "${STARTUP_RATIO}x"
echo ""
echo "Why: Node.js parses, compiles (to bytecode), and holds source for all"
echo "1M lines at runtime. Go compiles ahead of time — the 1M lines become"
echo "machine code baked into the binary; only actual allocations hit RSS."
