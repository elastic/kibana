#!/usr/bin/env bash

set -euo pipefail

# Function to generate and publish performance test reports
# Requires environment variables:
#   TEST_EXIT_CODE - exit code from test execution
#   TEST_DURATION - test duration in seconds
#   TEST_LOG_DIR - path to logs directory
#   PERF_DATA_FILE - data file used
#   PERF_TOTAL_ROWS - total number of logs in the data file
#   PERF_INTERVAL - interval in seconds
#   PERF_COUNT - number of uploads
#   CLOUD_DEPLOYMENT_ID - deployment ID
#   CLOUD_DEPLOYMENT_KIBANA_URL - Kibana URL
#   CLOUD_DEPLOYMENT_ELASTICSEARCH_URL - Elasticsearch URL

# Function to format large numbers (e.g., 1000000 -> "1m", 7500000 -> "7.5m")
format_log_count() {
  local count=$1
  if [ -z "$count" ] || [ "$count" = "unknown" ]; then
    echo "unknown"
    return
  fi
  
  # Convert to integer
  count=$((count + 0))
  
  if [ $count -ge 1000000 ]; then
    # Format as millions with one decimal place if needed
    local millions=$(awk "BEGIN {printf \"%.1f\", $count / 1000000}")
    # Remove trailing .0 if it's a whole number
    if echo "$millions" | grep -q '\.0$'; then
      millions=$(echo "$millions" | sed 's/\.0$//')
    fi
    echo "${millions}m"
  elif [ $count -ge 1000 ]; then
    # Format as thousands
    local thousands=$(awk "BEGIN {printf \"%.1f\", $count / 1000}")
    if echo "$thousands" | grep -q '\.0$'; then
      thousands=$(echo "$thousands" | sed 's/\.0$//')
    fi
    echo "${thousands}k"
  else
    echo "$count"
  fi
}

generate_performance_report() {
  # Ensure KIBANA_DIR is set
  if [ -z "${KIBANA_DIR:-}" ]; then
    source .buildkite/scripts/common/env.sh 2>/dev/null || true
    if [ -z "${KIBANA_DIR:-}" ]; then
      KIBANA_DIR=$(pwd)
      export KIBANA_DIR
    fi
  fi

  # Validate required environment variables
  if [ -z "${TEST_EXIT_CODE:-}" ] || \
     [ -z "${TEST_DURATION:-}" ] || \
     [ -z "${TEST_LOG_DIR:-}" ] || \
     [ -z "${PERF_DATA_FILE:-}" ] || \
     [ -z "${PERF_TOTAL_ROWS:-}" ] || \
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
    NODE_STATS_LOG=$(find "$LOG_DIR" -name "*node-stats.log" | head -1)
    KIBANA_STATS_LOG=$(find "$LOG_DIR" -name "*kibana-stats.log" | head -1)

    # Upload log files as artifacts
    if [ -n "$CLUSTER_HEALTH_LOG" ]; then
      echo "Found cluster health log: $CLUSTER_HEALTH_LOG"
      buildkite-agent artifact upload "$CLUSTER_HEALTH_LOG"
    fi

    if [ -n "$TRANSFORM_STATS_LOG" ]; then
      echo "Found transform stats log: $TRANSFORM_STATS_LOG"
      buildkite-agent artifact upload "$TRANSFORM_STATS_LOG"
    fi

    if [ -n "$NODE_STATS_LOG" ]; then
      echo "Found node stats log: $NODE_STATS_LOG"
      buildkite-agent artifact upload "$NODE_STATS_LOG"
    fi

    if [ -n "$KIBANA_STATS_LOG" ]; then
      echo "Found Kibana stats log: $KIBANA_STATS_LOG"
      buildkite-agent artifact upload "$KIBANA_STATS_LOG"
    fi
  fi

  # Compare with baseline if available
  echo "--- Compare with Baseline"
  source "$KIBANA_DIR/.buildkite/scripts/steps/entity_store_performance/compare_with_baseline.sh"
  compare_with_baseline

  # Upload comparison report as artifact if available
  if [ -n "${COMPARISON_FILE:-}" ] && [ -f "$COMPARISON_FILE" ] && [ -s "$COMPARISON_FILE" ]; then
    echo "Uploading comparison report as artifact"
    buildkite-agent artifact upload "$COMPARISON_FILE"
  fi

  echo "--- Generate Performance Report"
  REPORT_FILE=$(mktemp)
  
  # Format log count
  FORMATTED_LOG_COUNT=$(format_log_count "$PERF_TOTAL_ROWS")

  cat > "$REPORT_FILE" <<EOF
# Entity Store Performance Test Report

## Test Configuration
- **Data File**: $PERF_DATA_FILE ($FORMATTED_LOG_COUNT logs)
- **Upload Interval**: ${PERF_INTERVAL}s
- **Upload Count**: $PERF_COUNT
- **Total Duration**: ${TEST_DURATION}s

## Deployment Information
- **Deployment ID**: $CLOUD_DEPLOYMENT_ID
- **Kibana URL**: $CLOUD_DEPLOYMENT_KIBANA_URL
- **Elasticsearch URL**: $CLOUD_DEPLOYMENT_ELASTICSEARCH_URL

EOF

  # Add deployment resource specifications if available
  if [ -n "${KIBANA_MEMORY:-}" ] && [ "${KIBANA_MEMORY}" != "unknown" ] && [ "${KIBANA_MEMORY}" != "null" ]; then
    echo "### Deployment Resources" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if [ -n "${ES_HARDWARE_PROFILE:-}" ] && [ "${ES_HARDWARE_PROFILE}" != "unknown" ] && [ "${ES_HARDWARE_PROFILE}" != "null" ]; then
      echo "#### Hardware Profile" >> "$REPORT_FILE"
      echo "- **Elasticsearch**: ${ES_HARDWARE_PROFILE}" >> "$REPORT_FILE"
      echo "" >> "$REPORT_FILE"
    fi
    
    echo "#### Kibana" >> "$REPORT_FILE"
    echo "- **Memory**: ${KIBANA_MEMORY}MB" >> "$REPORT_FILE"
    echo "- **Zones**: ${KIBANA_ZONES:-unknown}" >> "$REPORT_FILE"
    echo "- **Instance Config**: ${KIBANA_INSTANCE_CONFIG:-unknown}" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if [ -n "${ES_TOTAL_MEMORY:-}" ] && [ "${ES_TOTAL_MEMORY}" != "0" ] && [ "${ES_TOTAL_MEMORY}" != "null" ]; then
      echo "#### Elasticsearch" >> "$REPORT_FILE"
      echo "- **Total Memory**: ${ES_TOTAL_MEMORY}MB" >> "$REPORT_FILE"
      echo "- **Node Count**: ${ES_NODE_COUNT:-unknown}" >> "$REPORT_FILE"
      echo "- **Zones**: ${ES_ZONES:-unknown}" >> "$REPORT_FILE"
      if [ -n "${ES_NODE_DETAILS:-}" ]; then
        echo "- **Node Details**: ${ES_NODE_DETAILS}" >> "$REPORT_FILE"
      fi
      echo "" >> "$REPORT_FILE"
    fi
  fi

  cat >> "$REPORT_FILE" <<EOF
## Test Results
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
  fi

  # Parse node stats log if available
  if [ -n "${NODE_STATS_LOG:-}" ] && [ -f "$NODE_STATS_LOG" ]; then
    echo "### Node Stats Metrics" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Extract key metrics from node stats
    if command -v jq &> /dev/null; then
      # Get the last line and extract JSON (format: TIMESTAMP - JSON)
      LAST_LINE=$(tail -1 "$NODE_STATS_LOG" 2>/dev/null || echo "")
      if [ -n "$LAST_LINE" ]; then
        # Extract JSON part after " - " separator, or use whole line if no separator
        if echo "$LAST_LINE" | grep -q " - "; then
          JSON_PART=$(echo "$LAST_LINE" | sed 's/^[^ ]* - //')
        else
          JSON_PART="$LAST_LINE"
        fi
        
        if echo "$JSON_PART" | jq . > /dev/null 2>&1; then
          # Get number of nodes
          NODE_COUNT=$(echo "$JSON_PART" | jq -r '.nodes | length')
          echo "**Number of Nodes**: $NODE_COUNT" >> "$REPORT_FILE"
          echo "" >> "$REPORT_FILE"
          
          # Extract metrics for each node
          echo "$JSON_PART" | jq -r '.nodes[] | 
            "#### \(.node_name) (\(.node_id))",
            "- **CPU Usage**: \(.os.cpu.percent // .cpu.percent // "unknown")%",
            "- **JVM Heap Used**: \(.jvm.mem.heap_used_percent)% (\(.jvm.mem.heap_used_in_bytes // 0 / 1024 / 1024 | floor)MB / \(.jvm.mem.heap_max_in_bytes // 0 / 1024 / 1024 | floor)MB)",
            "- **OS Memory Used**: \(.os.mem.used_percent)% (\(.os.mem.used_in_bytes // 0 / 1024 / 1024 | floor)MB / \(.os.mem.total_in_bytes // 0 / 1024 / 1024 | floor)MB)",
            "- **Load Average (1m/5m/15m)**: \(.os.cpu.load_average."1m" | tostring) / \(.os.cpu.load_average."5m" | tostring) / \(.os.cpu.load_average."15m" | tostring)",
            "- **GC Young Collections**: \(.jvm.gc.collectors.young.collection_count) (total time: \(.jvm.gc.collectors.young.collection_time_in_millis)ms)",
            "- **GC Old Collections**: \(.jvm.gc.collectors.old.collection_count) (total time: \(.jvm.gc.collectors.old.collection_time_in_millis)ms)",
            ""' >> "$REPORT_FILE"
        fi
      fi
    fi
  fi

  # Add comparison results to annotation if available
  if [ -n "${COMPARISON_OUTPUT:-}" ] && [ -n "$COMPARISON_OUTPUT" ]; then
    echo "" >> "$REPORT_FILE"
    echo "### Baseline Comparison" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
    echo "$COMPARISON_OUTPUT" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
  fi

  # Display report
  cat "$REPORT_FILE"

  # Annotate Buildkite with report
  buildkite-agent annotate --style "info" --context "entity-store-performance" < "$REPORT_FILE"

  # Upload report as artifact
  buildkite-agent artifact upload "$REPORT_FILE"

  # Create formatted PR comment with collapsible section
  echo "--- Create PR Comment"
  PR_COMMENT_FILE=$(mktemp)
  
  {
    echo "## Entity Store Performance Tests"
    echo ""
    echo "**Build**: [${BUILDKITE_BUILD_NUMBER:-N/A}](${BUILDKITE_BUILD_URL:-})"
    echo "**Duration**: ${TEST_DURATION}s"
    echo "**Data File**: ${PERF_DATA_FILE} ($(format_log_count "$PERF_TOTAL_ROWS") logs)"
    echo ""
    echo "<details>"
    echo "<summary>Click to expand full performance report</summary>"
    echo ""
    cat "$REPORT_FILE"
    echo ""
    echo "</details>"
  } > "$PR_COMMENT_FILE"
  
  # Post comment directly to PR
  echo "Posting performance report to PR"
  (cd "$KIBANA_DIR" && ts-node .buildkite/scripts/lifecycle/comment_on_pr.ts \
    --message "$(cat "$PR_COMMENT_FILE")" \
    --context "entity-store-performance-job" \
    --clear-previous)

  # Set metadata for PR comment
  buildkite-agent meta-data set "entity_store_performance_duration" "$TEST_DURATION"
  buildkite-agent meta-data set "entity_store_performance_data_file" "$PERF_DATA_FILE"
}

# If script is executed directly (not sourced), run the function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  generate_performance_report
fi

