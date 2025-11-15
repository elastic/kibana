#!/usr/bin/env bash

set -euo pipefail

# Function to generate and publish performance test reports
# Requires environment variables:
#   TEST_EXIT_CODE - exit code from test execution
#   TEST_DURATION - test duration in seconds
#   TEST_LOG_DIR - path to logs directory
#   PERF_DATA_FILE - data file used
#   PERF_INTERVAL - interval in seconds
#   PERF_COUNT - number of uploads
#   CLOUD_DEPLOYMENT_ID - deployment ID
#   CLOUD_DEPLOYMENT_KIBANA_URL - Kibana URL
#   CLOUD_DEPLOYMENT_ELASTICSEARCH_URL - Elasticsearch URL

generate_performance_report() {
  # Validate required environment variables
  if [ -z "${TEST_EXIT_CODE:-}" ] || \
     [ -z "${TEST_DURATION:-}" ] || \
     [ -z "${TEST_LOG_DIR:-}" ] || \
     [ -z "${PERF_DATA_FILE:-}" ] || \
     [ -z "${PERF_INTERVAL:-}" ] || \
     [ -z "${PERF_COUNT:-}" ] || \
     [ -z "${CLOUD_DEPLOYMENT_ID:-}" ] || \
     [ -z "${CLOUD_DEPLOYMENT_KIBANA_URL:-}" ] || \
     [ -z "${CLOUD_DEPLOYMENT_ELASTICSEARCH_URL:-}" ]; then
    echo "Error: Required environment variables are missing"
    exit 1
  fi

  echo "--- Collect and Parse Logs"
  LOG_DIR="$TEST_LOG_DIR"

  if [ ! -d "$LOG_DIR" ]; then
    echo "Warning: Log directory not found: $LOG_DIR"
  else
    # Find log files
    CLUSTER_HEALTH_LOG=$(find "$LOG_DIR" -name "*cluster-health.log" | head -1)
    TRANSFORM_STATS_LOG=$(find "$LOG_DIR" -name "*transform-stats.log" | head -1)

    # Upload log files as artifacts
    if [ -n "$CLUSTER_HEALTH_LOG" ]; then
      echo "Found cluster health log: $CLUSTER_HEALTH_LOG"
      buildkite-agent artifact upload "$CLUSTER_HEALTH_LOG"
    fi

    if [ -n "$TRANSFORM_STATS_LOG" ]; then
      echo "Found transform stats log: $TRANSFORM_STATS_LOG"
      buildkite-agent artifact upload "$TRANSFORM_STATS_LOG"
    fi
  fi

  echo "--- Generate Performance Report"
  REPORT_FILE=$(mktemp)

  cat > "$REPORT_FILE" <<EOF
# Entity Store Performance Test Report

## Test Configuration
- **Data File**: $PERF_DATA_FILE
- **Upload Interval**: ${PERF_INTERVAL}s
- **Upload Count**: $PERF_COUNT
- **Total Duration**: ${TEST_DURATION}s

## Deployment Information
- **Deployment ID**: $CLOUD_DEPLOYMENT_ID
- **Kibana URL**: $CLOUD_DEPLOYMENT_KIBANA_URL
- **Elasticsearch URL**: $CLOUD_DEPLOYMENT_ELASTICSEARCH_URL

## Test Results
- **Status**: $([ $TEST_EXIT_CODE -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")
- **Exit Code**: $TEST_EXIT_CODE

EOF

  # Parse cluster health log if available
  if [ -n "${CLUSTER_HEALTH_LOG:-}" ] && [ -f "$CLUSTER_HEALTH_LOG" ]; then
    echo "### Cluster Health Metrics" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Extract key metrics from cluster health
    if command -v jq &> /dev/null; then
      # Try to parse JSON if log contains JSON
      LAST_HEALTH=$(tail -1 "$CLUSTER_HEALTH_LOG" 2>/dev/null || echo "")
      if echo "$LAST_HEALTH" | jq . > /dev/null 2>&1; then
        echo "**Last Status**: $(echo "$LAST_HEALTH" | jq -r '.status // "unknown"')" >> "$REPORT_FILE"
        echo "**Number of Nodes**: $(echo "$LAST_HEALTH" | jq -r '.number_of_nodes // "unknown"')" >> "$REPORT_FILE"
        echo "**Active Shards**: $(echo "$LAST_HEALTH" | jq -r '.active_shards // "unknown"')" >> "$REPORT_FILE"
      fi
    fi
    
    echo "" >> "$REPORT_FILE"
    echo "**Recent Cluster Health Log (last 10 entries)**:"
    echo "\`\`\`" >> "$REPORT_FILE"
    tail -10 "$CLUSTER_HEALTH_LOG" >> "$REPORT_FILE" || true
    echo "\`\`\`" >> "$REPORT_FILE"
  fi

  # Parse transform stats log if available
  if [ -n "${TRANSFORM_STATS_LOG:-}" ] && [ -f "$TRANSFORM_STATS_LOG" ]; then
    echo "### Transform Performance Metrics" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Extract key metrics from transform stats
    if command -v jq &> /dev/null; then
      # Try to parse JSON if log contains JSON
      LAST_STATS=$(tail -1 "$TRANSFORM_STATS_LOG" 2>/dev/null || echo "")
      if echo "$LAST_STATS" | jq . > /dev/null 2>&1; then
        echo "**State**: $(echo "$LAST_STATS" | jq -r '.state // "unknown"')" >> "$REPORT_FILE"
        echo "**Indexed Documents**: $(echo "$LAST_STATS" | jq -r '.stats.index_total // "unknown"')" >> "$REPORT_FILE"
        echo "**Index Time**: $(echo "$LAST_STATS" | jq -r '.stats.index_time_in_millis // "unknown"')ms" >> "$REPORT_FILE"
      fi
    fi
    
    echo "" >> "$REPORT_FILE"
    echo "**Recent Transform Stats Log (last 10 entries)**:"
    echo "\`\`\`" >> "$REPORT_FILE"
    tail -10 "$TRANSFORM_STATS_LOG" >> "$REPORT_FILE" || true
    echo "\`\`\`" >> "$REPORT_FILE"
  fi

  # Display report
  cat "$REPORT_FILE"

  # Annotate Buildkite with report
  buildkite-agent annotate --style "info" --context "entity-store-performance" < "$REPORT_FILE"

  # Upload report as artifact
  buildkite-agent artifact upload "$REPORT_FILE"

  # Set metadata for PR comment
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    buildkite-agent meta-data set "entity_store_performance_status" "passed"
  else
    buildkite-agent meta-data set "entity_store_performance_status" "failed"
  fi

  buildkite-agent meta-data set "entity_store_performance_duration" "$TEST_DURATION"
  buildkite-agent meta-data set "entity_store_performance_data_file" "$PERF_DATA_FILE"
}

# If script is executed directly (not sourced), run the function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  generate_performance_report
fi

