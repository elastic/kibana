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
#   ./scripts/sidecar_scale_bench.sh [--url http://localhost:5601] [--connections 10] [--duration 30] [--threads 2]

set -euo pipefail

KIBANA_URL="http://localhost:5601"
CONNECTIONS=10
DURATION=30
THREADS=2

while [[ $# -gt 0 ]]; do
  case $1 in
    --url) KIBANA_URL="$2"; shift 2 ;;
    --connections) CONNECTIONS="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    --threads) THREADS="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LUA_SCRIPT="$SCRIPT_DIR/sidecar_scale_bench_wrk.lua"

if ! command -v wrk &>/dev/null; then
  echo "ERROR: wrk not found. Install with: brew install wrk"
  exit 1
fi

# Authenticate to get a session cookie
echo "Authenticating..."
COOKIE=$(curl -s -D - -o /dev/null \
  "${KIBANA_URL}/internal/security/login" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: Kibana' \
  --data-raw '{"providerType":"basic","providerName":"basic","currentURL":"'${KIBANA_URL}'/login","params":{"username":"elastic","password":"changeme"}}' \
  2>/dev/null | grep -i '^set-cookie:' | head -1 | sed 's/^[Ss]et-[Cc]ookie: //; s/;.*//')

if [ -z "$COOKIE" ]; then
  echo "ERROR: Could not authenticate."
  exit 1
fi
echo "Authenticated."

# Warmup
echo "Warming up (3 requests)..."
for w in 1 2 3; do
  curl -s -o /dev/null \
    "${KIBANA_URL}/internal/search/ese" \
    -H 'Content-Type: application/json' \
    -b "$COOKIE" \
    -H 'elastic-api-version: 1' \
    -H 'kbn-build-number: 9007199254740991' \
    -H 'kbn-version: 9.7.0' \
    -H 'kbn-system-request: true' \
    -H 'x-elastic-internal-origin: Kibana' \
    --data-raw '{"params":{"body":{"query":{"bool":{"must":[],"filter":[{"range":{"@timestamp":{"format":"strict_date_optional_time","gte":"2022-09-07T10:53:30.262Z","lte":"2022-09-07T10:55:09.280Z"}}}],"should":[],"must_not":[]}},"aggs":{"0":{"terms":{"field":"field0","order":{"_count":"desc"},"size":1000},"aggs":{"1":{"date_histogram":{"field":"@timestamp","fixed_interval":"99ms","time_zone":"America/Denver","extended_bounds":{"min":1662548010262,"max":1662548109280}}}}}},"size":0,"_source":{"excludes":[]},"stored_fields":["*"],"runtime_mappings":{},"script_fields":{},"fields":[{"field":"@timestamp","format":"date_time"}]},"index":"stresstest","preference":"bench"},"sessionId":"bench-scale","isRestore":false,"isStored":false,"isSearchStored":false,"requestHash":"bench","stream":true}' \
    2>/dev/null
  sleep 1
done

echo ""
echo "ESE Stresstest Scale Benchmark"
echo "URL: $KIBANA_URL"
echo "Connections: $CONNECTIONS  Threads: $THREADS  Duration: ${DURATION}s"
echo "========================================"

wrk -t"$THREADS" -c"$CONNECTIONS" -d"${DURATION}s" \
  -s "$LUA_SCRIPT" \
  -H "Cookie: $COOKIE" \
  "${KIBANA_URL}/internal/search/ese"

echo ""
echo "Done. Run again with/without sidecar to compare."
