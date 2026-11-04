#!/bin/bash
#
# Sidecar Scale Benchmark (wrk)
#
# Runs wrk against the ESE stresstest endpoint (~2.1 MB response) to measure
# throughput and latency under concurrent load.
#
# Prerequisites:
#   - wrk installed (brew install wrk)
#   - Kibana running
#   - "stresstest" index loaded
#
# Usage:
#   ./scripts/sidecar_scale_bench.sh [--url http://localhost:5601] [--connections 10] [--duration 30] [--threads 2] [--users 1]

set -euo pipefail

KIBANA_URL="http://localhost:5601"
CONNECTIONS=10
DURATION=30
THREADS=2
USERS=1

while [[ $# -gt 0 ]]; do
  case $1 in
    --url) KIBANA_URL="$2"; shift 2 ;;
    --connections) CONNECTIONS="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    --threads) THREADS="$2"; shift 2 ;;
    --users) USERS="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LUA_SCRIPT="$SCRIPT_DIR/sidecar_scale_bench_wrk.lua"

if ! command -v wrk &>/dev/null; then
  echo "ERROR: wrk not found. Install with: brew install wrk"
  exit 1
fi

# Authenticate N sessions
COOKIE_FILE=$(mktemp)
echo "Authenticating $USERS session(s)..."
for i in $(seq 1 "$USERS"); do
  cookie=$(curl -s -D - -o /dev/null \
    "${KIBANA_URL}/internal/security/login" \
    -H 'Content-Type: application/json' \
    -H 'kbn-xsrf: true' \
    -H 'x-elastic-internal-origin: Kibana' \
    --data-raw '{"providerType":"basic","providerName":"basic","currentURL":"'"${KIBANA_URL}"'/login","params":{"username":"elastic","password":"changeme"}}' \
    2>/dev/null | grep -i '^set-cookie:' | head -1 | sed 's/^[Ss]et-[Cc]ookie: //; s/;.*//')

  if [ -z "$cookie" ]; then
    echo "ERROR: Could not authenticate session $i."
    rm -f "$COOKIE_FILE"
    exit 1
  fi
  echo "$cookie" >> "$COOKIE_FILE"
done
echo "Authenticated $USERS session(s)."

FIRST_COOKIE=$(head -1 "$COOKIE_FILE")

# Warmup
echo "Warming up (3 requests)..."
for w in 1 2 3; do
  curl -s -o /dev/null \
    "${KIBANA_URL}/internal/search/ese" \
    -H 'Content-Type: application/json' \
    -b "$FIRST_COOKIE" \
    -H 'elastic-api-version: 1' \
    -H 'kbn-build-number: 9007199254740991' \
    -H 'kbn-version: 9.7.0' \
    -H 'kbn-system-request: true' \
    -H 'x-elastic-internal-origin: Kibana' \
    --data-raw '{"params":{"body":{"query":{"bool":{"must":[],"filter":[{"range":{"@timestamp":{"format":"strict_date_optional_time","gte":"2022-09-07T10:53:30.262Z","lte":"2022-09-07T10:55:09.280Z"}}}],"should":[],"must_not":[]}},"aggs":{"0":{"terms":{"field":"field0","order":{"_count":"desc"},"size":1000},"aggs":{"1":{"date_histogram":{"field":"@timestamp","fixed_interval":"99ms","time_zone":"America/Denver","extended_bounds":{"min":1662548010262,"max":1662548109280}}}}}},"size":0,"_source":{"excludes":[]},"stored_fields":["*"],"runtime_mappings":{},"script_fields":{},"fields":[{"field":"@timestamp","format":"date_time"}]},"index":"stresstest","preference":"bench"},"sessionId":"bench-scale","isRestore":false,"isStored":false,"isSearchStored":false,"requestHash":"bench","stream":true}' \
    2>/dev/null
  sleep 1
done

MEM_CSV=$(mktemp)
echo "timestamp,process,rss_kb" > "$MEM_CSV"

poll_memory() {
  while true; do
    local ts
    ts=$(date +%s)

    # Find the Kibana node process with the highest RSS (the server, not the launcher)
    local kbn_pid
    kbn_pid=$(pgrep -f 'node.*scripts/kibana' 2>/dev/null \
      | xargs -I{} ps -o pid=,rss= -p {} 2>/dev/null \
      | sort -k2 -rn | head -1 | awk '{print $1}' || true)
    if [ -z "$kbn_pid" ]; then
      kbn_pid=$(pgrep -f 'node.*kbn.*serve' 2>/dev/null \
        | xargs -I{} ps -o pid=,rss= -p {} 2>/dev/null \
        | sort -k2 -rn | head -1 | awk '{print $1}' || true)
    fi
    if [ -n "$kbn_pid" ]; then
      local rss
      rss=$(ps -o rss= -p "$kbn_pid" 2>/dev/null | tr -d ' ')
      [ -n "$rss" ] && echo "$ts,kibana,$rss" >> "$MEM_CSV"
    fi

    local sidecar_pid
    sidecar_pid=$(pgrep -f 'kbn_sidecar' 2>/dev/null | head -1 || true)
    if [ -n "$sidecar_pid" ]; then
      local rss
      rss=$(ps -o rss= -p "$sidecar_pid" 2>/dev/null | tr -d ' ')
      [ -n "$rss" ] && echo "$ts,sidecar,$rss" >> "$MEM_CSV"
    fi

    sleep 1
  done
}

# Take a baseline memory sample before load
echo "Sampling baseline memory..."
sleep 2
poll_memory &
POLL_PID=$!
sleep 3

echo ""
echo "ESE Stresstest Scale Benchmark"
echo "URL: $KIBANA_URL"
echo "Connections: $CONNECTIONS  Threads: $THREADS  Duration: ${DURATION}s  Users: $USERS"
echo "========================================"

export WRK_COOKIE_FILE="$COOKIE_FILE"

wrk -t"$THREADS" -c"$CONNECTIONS" -d"${DURATION}s" \
  -s "$LUA_SCRIPT" \
  "${KIBANA_URL}/internal/search/ese"

# Let memory settle briefly after load
sleep 3
kill "$POLL_PID" 2>/dev/null || true
wait "$POLL_PID" 2>/dev/null || true

echo ""
echo "--- Memory Usage During Test ---"
awk -F, 'NR > 1 {
  proc=$2; rss=$3
  if (!(proc in min) || rss < min[proc]) min[proc] = rss
  if (!(proc in max) || rss > max[proc]) max[proc] = rss
  sum[proc] += rss; count[proc]++
}
END {
  for (p in count) {
    printf "  %-10s avg=%7d KB (%4.0f MB)  min=%7d KB (%4.0f MB)  max=%7d KB (%4.0f MB)\n",
      p, sum[p]/count[p], (sum[p]/count[p])/1024,
      min[p], min[p]/1024,
      max[p], max[p]/1024
  }
}' "$MEM_CSV"

rm -f "$MEM_CSV" "$COOKIE_FILE"

echo ""
echo "Done. Run again with/without sidecar to compare."
