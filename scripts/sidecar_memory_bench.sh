#!/bin/bash
#
# Sidecar Memory Benchmark (production build, idle)
#
# Measures idle RSS memory of a production Kibana build with and without
# the Go sidecar. Starts Kibana, waits for it to settle, samples RSS,
# and compares.
#
# Prerequisites:
#   - Elasticsearch running locally
#   - A release build: node scripts/build --release
#
# Usage:
#   ./scripts/sidecar_memory_bench.sh [--kibana-dir <path>] [--settle-time 30] [--sample-duration 20]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS_DIR="$REPO_ROOT/target/sidecar_bench_$(date +%Y%m%d_%H%M%S)"
KIBANA_DIR=""
SETTLE_TIME=30
SAMPLE_DURATION=20
POLL_INTERVAL=2
ES_CREDS="elastic:changeme"
PORT=5601

while [[ $# -gt 0 ]]; do
  case $1 in
    --kibana-dir) KIBANA_DIR="$2"; shift 2 ;;
    --settle-time) SETTLE_TIME="$2"; shift 2 ;;
    --sample-duration) SAMPLE_DURATION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Auto-detect the build output if not specified
if [ -z "$KIBANA_DIR" ]; then
  # Check target/ (extracted archive) first, then build/default/
  KIBANA_DIR=$(find "$REPO_ROOT/target" -maxdepth 1 -type d -name 'kibana-*' ! -name '*.tar.gz' 2>/dev/null | head -1)
  if [ -z "$KIBANA_DIR" ]; then
    KIBANA_DIR=$(find "$REPO_ROOT/build/default" -maxdepth 1 -type d -name 'kibana-*' 2>/dev/null | head -1)
  fi
  if [ -z "$KIBANA_DIR" ]; then
    echo "ERROR: No production build found. Run 'node scripts/build --release' first, or pass --kibana-dir."
    exit 1
  fi
fi

if [ ! -x "$KIBANA_DIR/bin/kibana" ]; then
  echo "ERROR: $KIBANA_DIR/bin/kibana not found or not executable"
  exit 1
fi

# Production Kibana can't run from inside the repo tree (getPackages walks up
# to the repo's node_modules). Copy to /tmp to isolate it.
ISOLATED_DIR="/tmp/kibana-bench-$$"
echo "[$(date +%H:%M:%S)] Copying build to $ISOLATED_DIR to isolate from repo..."
cp -a "$KIBANA_DIR" "$ISOLATED_DIR"
KIBANA_DIR="$ISOLATED_DIR"

mkdir -p "$RESULTS_DIR"

log() { echo "[$(date +%H:%M:%S)] $*"; }

cleanup() {
  log "Cleaning up..."
  [ -n "${KIBANA_PID:-}" ] && kill "$KIBANA_PID" 2>/dev/null || true
  sleep 2
  pkill -9 -f 'kbn_sidecar' 2>/dev/null || true
  [ -n "${ISOLATED_DIR:-}" ] && rm -rf "$ISOLATED_DIR"
}
trap cleanup EXIT

snapshot_memory() {
  local out="$1"
  local duration="$2"
  local end_time=$(($(date +%s) + duration))
  echo "timestamp,process,pid,rss_kb" > "$out"
  while [ "$(date +%s)" -lt "$end_time" ]; do
    local ts
    ts=$(date +%s)

    # Kibana main process (we started it, so use its PID)
    if [ -n "${KIBANA_PID:-}" ] && kill -0 "$KIBANA_PID" 2>/dev/null; then
      local rss
      rss=$(ps -o rss= -p "$KIBANA_PID" 2>/dev/null | tr -d ' ')
      [ -n "$rss" ] && echo "$ts,kibana,$KIBANA_PID,$rss" >> "$out"
    fi

    # Sidecar process
    local sidecar_pid
    sidecar_pid=$(pgrep -f 'kbn_sidecar' 2>/dev/null | head -1 || true)
    if [ -n "$sidecar_pid" ]; then
      local rss
      rss=$(ps -o rss= -p "$sidecar_pid" 2>/dev/null | tr -d ' ')
      [ -n "$rss" ] && echo "$ts,sidecar,$sidecar_pid,$rss" >> "$out"
    fi

    sleep "$POLL_INTERVAL"
  done
}

wait_for_kibana() {
  log "Waiting for Kibana on port ${PORT}..."
  local attempts=0
  while ! curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:${PORT}/api/status" \
    -H "x-elastic-internal-origin: Kibana" \
    -u "$ES_CREDS" 2>/dev/null | grep -q 200; do
    attempts=$((attempts + 1))
    if [ "$attempts" -gt 180 ]; then
      log "ERROR: Kibana did not become available within 6 minutes"
      exit 1
    fi
    sleep 2
  done
  log "Kibana is available"
}

summarize() {
  local csv="$1"
  local label="$2"
  echo ""
  echo "=== $label ==="
  awk -F, 'NR > 1 {
    proc=$2; rss=$4
    if (!(proc in min) || rss < min[proc]) min[proc] = rss
    if (!(proc in max) || rss > max[proc]) max[proc] = rss
    sum[proc] += rss; count[proc]++
  }
  END {
    for (p in count) {
      printf "  %-10s avg=%7d KB  (%.0f MB)\n",
        p, sum[p]/count[p], (sum[p]/count[p])/1024
    }
  }' "$csv"
}

run_test() {
  local label="$1"
  local sidecar_enabled="$2"
  local csv="$RESULTS_DIR/mem_${label}.csv"
  local logfile="$RESULTS_DIR/kibana_${label}.log"
  local config_file="$KIBANA_DIR/config/kibana.yml"

  log "=== $label ==="

  # Write config
  cat > "$config_file" <<EOF
server.host: "0.0.0.0"
server.port: ${PORT}
server.sidecar.enabled: ${sidecar_enabled}
elasticsearch.hosts: ["http://localhost:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "changeme"
EOF

  (cd "$KIBANA_DIR" && bin/kibana) > "$logfile" 2>&1 &
  KIBANA_PID=$!
  log "Kibana started (PID $KIBANA_PID)"

  wait_for_kibana

  log "Settling for ${SETTLE_TIME}s..."
  sleep "$SETTLE_TIME"

  log "Sampling memory for ${SAMPLE_DURATION}s..."
  snapshot_memory "$csv" "$SAMPLE_DURATION"

  kill "$KIBANA_PID" 2>/dev/null || true
  wait "$KIBANA_PID" 2>/dev/null || true
  KIBANA_PID=""
  pkill -9 -f 'kbn_sidecar' 2>/dev/null || true
  sleep 3
}

# ============================================================
log "Using Kibana from: $KIBANA_DIR"
log "Results will be saved to: $RESULTS_DIR/"

run_test "with_sidecar" "true"
run_test "without_sidecar" "false"

echo ""
echo "========================================"
echo "  SIDECAR IDLE MEMORY COMPARISON"
echo "========================================"

summarize "$RESULTS_DIR/mem_with_sidecar.csv" "WITH SIDECAR"
summarize "$RESULTS_DIR/mem_without_sidecar.csv" "WITHOUT SIDECAR"

echo ""
echo "Results saved to: $RESULTS_DIR/"
log "Done."
