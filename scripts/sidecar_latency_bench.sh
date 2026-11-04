#!/bin/bash
#
# Sidecar Latency Benchmark
#
# Measures TTFB and total transfer time for search requests through Kibana,
# subtracting Elasticsearch execution time to isolate Kibana overhead.
#
# Run once with the sidecar enabled, once without, and compare.
#
# Prerequisites:
#   - Kibana running at the given URL
#   - "stresstest" index loaded (from x-pack/performance/es_archives/stress_test)
#   - "million-integers" index loaded (from x-pack/performance/es_archives/million_integers)
#   - esql.query.result_truncation_max_size set to 1000000
#
# Usage:
#   ./scripts/sidecar_latency_bench.sh [--url http://localhost:5601] [--runs 30] [--cookie <sid>]

set -euo pipefail

KIBANA_URL="http://localhost:5601"
RUNS=30
COOKIE=""
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

while [[ $# -gt 0 ]]; do
  case $1 in
    --url) KIBANA_URL="$2"; shift 2 ;;
    --runs) RUNS="$2"; shift 2 ;;
    --cookie) COOKIE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Auto-detect cookie from Kibana if not provided
if [ -z "$COOKIE" ]; then
  echo "No --cookie provided. Authenticating to get a session cookie..."
  COOKIE=$(curl -s -D - -o /dev/null \
    "${KIBANA_URL}/internal/security/login" \
    -H 'Content-Type: application/json' \
    -H 'kbn-xsrf: true' \
    -H 'x-elastic-internal-origin: Kibana' \
    --data-raw '{"providerType":"basic","providerName":"basic","currentURL":"'${KIBANA_URL}'/login","params":{"username":"elastic","password":"changeme"}}' \
    2>/dev/null | grep -i '^set-cookie:' | head -1 | sed 's/^[Ss]et-[Cc]ookie: //; s/;.*//')
  if [ -z "$COOKIE" ]; then
    echo "ERROR: Could not authenticate. Pass --cookie manually."
    exit 1
  fi
  echo "Got session cookie."
fi

run_bench() {
  local label="$1"
  local endpoint="$2"
  local payload="$3"
  local extra_headers="$4"

  echo ""
  echo "=== $label ==="
  echo "run,http_code,ttfb_s,time_total_s,size_bytes,es_took_ms,ttfb_overhead_ms,total_overhead_ms"

  # Warmup
  for w in 1 2 3; do
    curl -s -o /dev/null \
      --url "${KIBANA_URL}${endpoint}" \
      -H 'Content-Type: application/json' \
      -b "$COOKIE" \
      -H 'elastic-api-version: 1' \
      -H 'kbn-build-number: 9007199254740991' \
      -H 'kbn-version: 9.7.0' \
      -H 'x-elastic-internal-origin: Kibana' \
      $extra_headers \
      --data-raw "$payload" 2>/dev/null
    sleep 1
  done

  local ttfb_sum=0
  local total_sum=0
  local count=0

  for i in $(seq 1 "$RUNS"); do
    stats=$(curl -s -o "$TMPFILE" -w '%{http_code},%{time_starttransfer},%{time_total},%{size_download}' \
      --url "${KIBANA_URL}${endpoint}" \
      -H 'Content-Type: application/json' \
      -b "$COOKIE" \
      -H 'elastic-api-version: 1' \
      -H 'kbn-build-number: 9007199254740991' \
      -H 'kbn-version: 9.7.0' \
      -H 'x-elastic-internal-origin: Kibana' \
      $extra_headers \
      --data-raw "$payload" 2>/dev/null)

    http_code=$(echo "$stats" | cut -d, -f1)
    ttfb=$(echo "$stats" | cut -d, -f2)
    time_total=$(echo "$stats" | cut -d, -f3)
    size=$(echo "$stats" | cut -d, -f4)

    es_took=$(grep -o '"took":[0-9]*' "$TMPFILE" | head -1 | cut -d: -f2)
    es_took=${es_took:-0}

    ttfb_overhead=$(awk "BEGIN { printf \"%.1f\", ($ttfb * 1000) - $es_took }")
    total_overhead=$(awk "BEGIN { printf \"%.1f\", ($time_total * 1000) - $es_took }")

    echo "$i,$http_code,${ttfb},${time_total},${size},${es_took},${ttfb_overhead},${total_overhead}"

    ttfb_sum=$(awk "BEGIN { print $ttfb_sum + $ttfb_overhead }")
    total_sum=$(awk "BEGIN { print $total_sum + $total_overhead }")
    count=$((count + 1))

    sleep 1
  done

  local ttfb_avg=$(awk "BEGIN { printf \"%.1f\", $ttfb_sum / $count }")
  local total_avg=$(awk "BEGIN { printf \"%.1f\", $total_sum / $count }")

  echo ""
  echo "  Avg TTFB overhead:  ${ttfb_avg} ms"
  echo "  Avg total overhead: ${total_avg} ms"
  echo "  Runs: $count"
}

ESQL_PAYLOAD='{"params":{"query":"FROM million-integers | MV_EXPAND values | EVAL @timestamp = TO_DATETIME(values * 1000 + 1791493960000) | LIMIT 1000000","filter":{"bool":{"must":[],"filter":[{"range":{"@timestamp":{"format":"strict_date_optional_time","gte":"2026-10-04T05:22:33.761Z","lte":"2026-10-22T20:24:25.058Z"}}}],"should":[],"must_not":[]}},"time_zone":"America/Denver","locale":"en","dropNullColumns":true,"include_execution_metadata":true,"settings":{"column_metadata":true}},"sessionId":"bench-esql","isRestore":false,"isStored":false,"isSearchStored":false,"requestHash":"bench","stream":true}'

ESE_PAYLOAD='{"params":{"body":{"query":{"bool":{"must":[],"filter":[{"range":{"@timestamp":{"format":"strict_date_optional_time","gte":"2022-09-07T10:53:30.262Z","lte":"2022-09-07T10:55:09.280Z"}}}],"should":[],"must_not":[]}},"aggs":{"0":{"terms":{"field":"field0","order":{"_count":"desc"},"size":1000},"aggs":{"1":{"date_histogram":{"field":"@timestamp","fixed_interval":"99ms","time_zone":"America/Denver","extended_bounds":{"min":1662548010262,"max":1662548109280}}}}}},"size":0,"_source":{"excludes":[]},"stored_fields":["*"],"runtime_mappings":{},"script_fields":{},"fields":[{"field":"@timestamp","format":"date_time"}]},"index":"stresstest","preference":"bench"},"sessionId":"bench-ese","isRestore":false,"isStored":false,"isSearchStored":false,"requestHash":"bench","stream":true}'

echo "Sidecar Latency Benchmark"
echo "URL: $KIBANA_URL"
echo "Runs per endpoint: $RUNS"

run_bench "ES|QL (million points, ~39 MB)" "/internal/search/esql_async" "$ESQL_PAYLOAD" ""
run_bench "ESE (stresstest aggs, ~2.1 MB)" "/internal/search/ese" "$ESE_PAYLOAD" "-H kbn-system-request:true"

echo ""
echo "========================================"
echo "Done. Run again with/without sidecar to compare."
