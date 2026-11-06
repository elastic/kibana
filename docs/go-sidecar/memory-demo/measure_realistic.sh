#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_DIR="$SCRIPT_DIR/node-realistic"
GO_DIR="$SCRIPT_DIR/go-realistic"

cleanup() {
  [ -n "${NODE_PID:-}" ] && kill "$NODE_PID" 2>/dev/null || true
  [ -n "${GO_PID:-}" ] && kill "$GO_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT

if [ ! -d "$NODE_DIR/plugins" ] || [ ! -d "$GO_DIR/plugins" ]; then
  echo "Generated code not found. Run 'node generate_realistic.js' first."
  exit 1
fi

RSS_SAMPLES=20
RSS_INTERVAL=0.25

get_rss_kb() {
  ps -o rss= -p "$1" 2>/dev/null | tr -d ' '
}

avg_rss_kb() {
  local pid="$1" total=0
  for _ in $(seq 1 "$RSS_SAMPLES"); do
    local sample
    sample=$(get_rss_kb "$pid")
    total=$((total + sample))
    sleep "$RSS_INTERVAL"
  done
  echo $((total / RSS_SAMPLES))
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

echo "=== Realistic Kibana Simulation: Node.js vs Go ==="
echo "    400 plugins, 1,200 routes, 400 SO types, 400 config schemas"
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
node "$NODE_DIR/server.js" &
NODE_PID=$!
wait_for_server "http://localhost:3003/health" 120
curl -sf http://localhost:3003/health
echo
sleep 1

echo "  Sampling RSS (${RSS_SAMPLES} × ${RSS_INTERVAL}s)..."
NODE_RSS=$(avg_rss_kb "$NODE_PID")
NODE_RSS_MB=$((NODE_RSS / 1024))
echo "  Node.js RSS: ${NODE_RSS_MB} MB (${NODE_RSS} KB avg)"

kill "$NODE_PID" 2>/dev/null; wait "$NODE_PID" 2>/dev/null || true
unset NODE_PID
echo

# --- Go ---
echo "Starting Go server..."
"$GO_DIR/server" &
GO_PID=$!
wait_for_server "http://localhost:3004/health" 10
curl -sf http://localhost:3004/health
echo
sleep 1

echo "  Sampling RSS (${RSS_SAMPLES} × ${RSS_INTERVAL}s)..."
GO_RSS=$(avg_rss_kb "$GO_PID")
GO_RSS_MB=$((GO_RSS / 1024))
echo "  Go RSS: ${GO_RSS_MB} MB (${GO_RSS} KB avg)"

kill "$GO_PID" 2>/dev/null; wait "$GO_PID" 2>/dev/null || true
unset GO_PID
echo

# --- Summary ---
MEMORY_RATIO=$(echo "scale=1; $NODE_RSS_MB / $GO_RSS_MB" | bc)

echo "=== Results ==="
echo ""
echo "|            | Go   | Node.js | Difference |"
echo "|------------|------|---------|------------|"
printf "| RSS (MB)   | %4d | %7d | %7s |\n" "$GO_RSS_MB" "$NODE_RSS_MB" "${MEMORY_RATIO}x"
echo ""
echo "Simulates Kibana's startup registrations: each plugin registers"
echo "routes with validation schemas, saved object types with mappings"
echo "and migrations, config schemas, and a plugin contract with internal"
echo "state (Maps, Sets). Measures the cost of holding all those objects"
echo "in memory — not just loading source code."
