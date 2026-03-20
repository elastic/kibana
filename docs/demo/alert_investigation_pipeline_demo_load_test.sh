#!/bin/bash
# Alert Investigation Pipeline - Load Test Script
#
# This script runs the pipeline multiple times with varying loads to demonstrate
# performance characteristics during demos.
#
# Usage: ./demo_load_test.sh [--requests N] [--concurrent N]

set -e  # Exit on error

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
API_KEY="${ELASTIC_API_KEY:-}"  # Set this or use --user
REQUESTS=${REQUESTS:-10}
CONCURRENT=${CONCURRENT:-1}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --requests)
      REQUESTS="$2"
      shift 2
      ;;
    --concurrent)
      CONCURRENT="$2"
      shift 2
      ;;
    --url)
      KIBANA_URL="$2"
      shift 2
      ;;
    --api-key)
      API_KEY="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--requests N] [--concurrent N] [--url URL] [--api-key KEY]"
      exit 1
      ;;
  esac
done

echo "🔥 Alert Investigation Pipeline - Load Test"
echo "==========================================="
echo ""
echo "Configuration:"
echo "  - Kibana URL: $KIBANA_URL"
echo "  - Requests: $REQUESTS"
echo "  - Concurrent: $CONCURRENT"
echo ""

# Prepare auth header
if [ -n "$API_KEY" ]; then
  AUTH_HEADER="Authorization: ApiKey $API_KEY"
else
  AUTH_HEADER="Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
  echo "⚠️  Using default credentials (elastic:changeme)"
  echo "  Set ELASTIC_API_KEY env var for production use"
  echo ""
fi

# Test configurations (varying alert counts and lookback windows)
CONFIGS=(
  '{"dry_run":false,"max_alerts":100,"lookback_minutes":15,"similarity_threshold":0.85}'
  '{"dry_run":false,"max_alerts":250,"lookback_minutes":30,"similarity_threshold":0.85}'
  '{"dry_run":false,"max_alerts":500,"lookback_minutes":60,"similarity_threshold":0.85}'
)

RESULTS_FILE="/tmp/pipeline_load_test_results_$(date +%Y%m%d_%H%M%S).json"
echo "📊 Results will be saved to: $RESULTS_FILE"
echo ""

# Function to run a single pipeline request
run_pipeline() {
  local config="$1"
  local request_num="$2"
  local start_time=$(date +%s%3N)  # Milliseconds

  local response=$(curl -s -w "\n%{http_code}" -X POST \
    "$KIBANA_URL/internal/elastic_assistant/attack_discovery/pipeline/_run" \
    -H 'Content-Type: application/json' \
    -H 'kbn-xsrf: true' \
    -H "$AUTH_HEADER" \
    -d "$config")

  local http_code=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$ d')
  local end_time=$(date +%s%3N)
  local duration=$((end_time - start_time))

  # Extract key metrics from response
  local alerts_processed=$(echo "$body" | jq -r '.alertsProcessed // 0')
  local alerts_deduped=$(echo "$body" | jq -r '.alertsDeduplicated // 0')
  local dedup_rate=$(echo "$body" | jq -r '.deduplicationRate // 0')
  local entities_extracted=$(echo "$body" | jq -r '.entitiesExtracted // 0')

  # Output result
  local result="{
    \"request\": $request_num,
    \"config\": $config,
    \"http_code\": $http_code,
    \"duration_ms\": $duration,
    \"metrics\": {
      \"alertsProcessed\": $alerts_processed,
      \"alertsDeduplicated\": $alerts_deduped,
      \"deduplicationRate\": $dedup_rate,
      \"entitiesExtracted\": $entities_extracted
    }
  }"

  echo "$result" >> "$RESULTS_FILE"

  # Progress indicator
  if [ "$http_code" = "200" ]; then
    echo "  ✓ Request $request_num: ${duration}ms | Alerts: $alerts_processed | Dedup: $dedup_rate | Entities: $entities_extracted"
  else
    echo "  ✗ Request $request_num: HTTP $http_code | Duration: ${duration}ms"
  fi
}

# Initialize results file
echo "[" > "$RESULTS_FILE"

# Run load test
echo "🏃 Running $REQUESTS requests (concurrency: $CONCURRENT)..."
echo ""

request_count=0
for ((i=0; i<$REQUESTS; i++)); do
  # Select config (cycle through available configs)
  config_index=$((i % ${#CONFIGS[@]}))
  config="${CONFIGS[$config_index]}"

  request_count=$((request_count + 1))

  # Run request (in background if concurrent > 1)
  if [ "$CONCURRENT" -gt 1 ]; then
    run_pipeline "$config" "$request_count" &

    # Wait if we've hit concurrency limit
    if [ $((request_count % CONCURRENT)) -eq 0 ]; then
      wait  # Wait for background jobs to complete
    fi
  else
    run_pipeline "$config" "$request_count"
  fi
done

# Wait for any remaining background jobs
wait

# Finalize results file
echo "]" >> "$RESULTS_FILE"

echo ""
echo "════════════════════════════════════════"
echo "✅ Load test complete!"
echo "════════════════════════════════════════"
echo ""

# Calculate summary statistics
echo "📈 Summary Statistics:"
echo "──────────────────────"

SUCCESS_COUNT=$(jq '[.[] | select(.http_code == 200)] | length' "$RESULTS_FILE")
FAILURE_COUNT=$(jq '[.[] | select(.http_code != 200)] | length' "$RESULTS_FILE")
AVG_DURATION=$(jq '[.[] | select(.http_code == 200) | .duration_ms] | add / length | round' "$RESULTS_FILE")
MIN_DURATION=$(jq '[.[] | select(.http_code == 200) | .duration_ms] | min' "$RESULTS_FILE")
MAX_DURATION=$(jq '[.[] | select(.http_code == 200) | .duration_ms] | max' "$RESULTS_FILE")
P95_DURATION=$(jq '[.[] | select(.http_code == 200) | .duration_ms] | sort | .[(length * 0.95 | floor)]' "$RESULTS_FILE")

TOTAL_ALERTS=$(jq '[.[] | select(.http_code == 200) | .metrics.alertsProcessed] | add' "$RESULTS_FILE")
AVG_ALERTS=$(jq '[.[] | select(.http_code == 200) | .metrics.alertsProcessed] | add / length | round' "$RESULTS_FILE")
AVG_DEDUP_RATE=$(jq '[.[] | select(.http_code == 200) | .metrics.deduplicationRate] | add / length' "$RESULTS_FILE")

echo "  Requests:"
echo "    - Total:        $REQUESTS"
echo "    - Successful:   $SUCCESS_COUNT"
echo "    - Failed:       $FAILURE_COUNT"
echo "    - Success rate: $(jq -n "$SUCCESS_COUNT / $REQUESTS * 100 | round")%"
echo ""
echo "  Performance:"
echo "    - Avg duration: ${AVG_DURATION}ms"
echo "    - Min duration: ${MIN_DURATION}ms"
echo "    - Max duration: ${MAX_DURATION}ms"
echo "    - P95 duration: ${P95_DURATION}ms"
echo ""
echo "  Throughput:"
echo "    - Total alerts:        $TOTAL_ALERTS"
echo "    - Avg alerts/request:  $AVG_ALERTS"
echo "    - Avg dedup rate:      $(jq -n "$AVG_DEDUP_RATE * 100 | round")%"
echo "    - Alerts/second:       $(jq -n "$TOTAL_ALERTS / ($AVG_DURATION * $SUCCESS_COUNT / 1000) | round")"
echo ""
echo "📄 Detailed results: $RESULTS_FILE"
echo ""

# Check if performance meets SLA targets
echo "🎯 SLA Target Analysis (CrowdStrike-inspired 1-10-60 rule):"
echo "─────────────────────────────────────────────────────────"

# Target: < 5 min for 1K alerts, < 60 min for 10K alerts
# Extrapolate from avg
ALERTS_PER_1MIN=$(jq -n "60 / ($AVG_DURATION / 1000) * $AVG_ALERTS | round")
TIME_FOR_1K=$(jq -n "1000 / $ALERTS_PER_1MIN | round")
TIME_FOR_10K=$(jq -n "10000 / $ALERTS_PER_1MIN | round")

echo "  - Estimated throughput: $ALERTS_PER_1MIN alerts/min"
echo "  - Time for 1K alerts:   ${TIME_FOR_1K} min (target: < 5 min)"
echo "  - Time for 10K alerts:  ${TIME_FOR_10K} min (target: < 60 min)"
echo ""

if [ "$TIME_FOR_1K" -lt 5 ]; then
  echo "  ✅ PASS: Meets 1K alert SLA (${TIME_FOR_1K} < 5 min)"
else
  echo "  ❌ FAIL: Exceeds 1K alert SLA (${TIME_FOR_1K} >= 5 min)"
fi

if [ "$TIME_FOR_10K" -lt 60 ]; then
  echo "  ✅ PASS: Meets 10K alert SLA (${TIME_FOR_10K} < 60 min)"
else
  echo "  ❌ FAIL: Exceeds 10K alert SLA (${TIME_FOR_10K} >= 60 min)"
fi
echo ""

# Generate visualizations (if gnuplot available)
if command -v gnuplot &> /dev/null; then
  echo "📊 Generating performance graphs..."

  GRAPH_FILE="/tmp/pipeline_performance_$(date +%Y%m%d_%H%M%S).png"

  # Extract duration data
  jq -r '.[] | select(.http_code == 200) | .duration_ms' "$RESULTS_FILE" > /tmp/durations.dat

  gnuplot <<EOF
set terminal png size 800,600
set output '$GRAPH_FILE'
set title 'Alert Investigation Pipeline - Response Time Distribution'
set xlabel 'Request Number'
set ylabel 'Response Time (ms)'
set grid
plot '/tmp/durations.dat' using 0:1 with linespoints title 'Response Time', \
     $AVG_DURATION with lines linestyle 2 title 'Average ($AVG_DURATION ms)'
EOF

  echo "  ✓ Performance graph saved to: $GRAPH_FILE"
  rm /tmp/durations.dat
else
  echo "  ℹ️  Install gnuplot for performance graphs: brew install gnuplot"
fi
echo ""

echo "💡 Recommendations:"
if [ "$SUCCESS_COUNT" -lt "$REQUESTS" ]; then
  echo "  - ⚠️  $(jq -n "$FAILURE_COUNT / $REQUESTS * 100 | round")% failure rate detected. Investigate errors in $RESULTS_FILE"
fi

if [ "$TIME_FOR_1K" -gt 5 ]; then
  echo "  - ⚠️  Performance below SLA target. Consider:"
  echo "    • Increase Elasticsearch resources (memory, CPU)"
  echo "    • Optimize case matching queries"
  echo "    • Reduce entity extraction field count"
  echo "    • Increase deduplication threshold"
fi
echo ""
