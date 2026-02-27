#!/usr/bin/env bash

set -euo pipefail

# Function to compare current run with baseline
# Requires environment variables:
#   SECURITY_DOCS_GEN_DIR - path to security-documents-generator repo
#   TEST_LOG_DIR - path to logs directory
#   PERF_DATA_FILE - data file name (e.g., "big")
#   PERF_ENTITY_COUNT - number of entities
#   PERF_LOGS_PER_ENTITY - logs per entity
# Optional environment variables:
#   PERF_BASELINE_FILE - specific baseline file to use
#   PERF_DEGRADATION_THRESHOLD - degradation threshold % (default: 25)
#   PERF_WARNING_THRESHOLD - warning threshold % (default: 15)
#   PERF_IMPROVEMENT_THRESHOLD - improvement threshold % (default: 15)
#
# Exports:
#   COMPARISON_OUTPUT - full comparison report text
#   COMPARISON_EXIT_CODE - exit code from comparison
#   COMPARISON_FILE - path to comparison report file

compare_with_baseline() {
  # Validate required environment variables
  if [ -z "${SECURITY_DOCS_GEN_DIR:-}" ] || \
     [ -z "${TEST_LOG_DIR:-}" ] || \
     [ -z "${PERF_DATA_FILE:-}" ] || \
     [ -z "${PERF_ENTITY_COUNT:-}" ] || \
     [ -z "${PERF_LOGS_PER_ENTITY:-}" ]; then
    echo "Error: Required environment variables are missing for baseline comparison"
    return 1
  fi

  # Configurable thresholds with defaults
  PERF_DEGRADATION_THRESHOLD="${PERF_DEGRADATION_THRESHOLD:-25}"
  PERF_WARNING_THRESHOLD="${PERF_WARNING_THRESHOLD:-15}"
  PERF_IMPROVEMENT_THRESHOLD="${PERF_IMPROVEMENT_THRESHOLD:-15}"

  echo "--- Compare with Baseline"
  
  cd "$SECURITY_DOCS_GEN_DIR"

  # Extract run name from log files (format: {PERF_DATA_FILE}-YYYY-MM-DDTHH:MM:SS)
  # Log files are named like: big-2025-11-17T14:39:20.813Z-cluster-health.log
  RUN_NAME=""
  if [ -d "$TEST_LOG_DIR" ]; then
    # Find any log file and extract the run name (prefix before .{milliseconds}Z-)
    LOG_FILE=$(find "$TEST_LOG_DIR" -name "*.log" -type f | head -1)
    if [ -n "$LOG_FILE" ]; then
      # Extract pattern: {PERF_DATA_FILE}-YYYY-MM-DDTHH:MM:SS (before .{milliseconds}Z-)
      BASENAME=$(basename "$LOG_FILE")
      # Remove the suffix starting with .{milliseconds}Z-{log-type}.log
      RUN_NAME=$(echo "$BASENAME" | sed -E 's/\.[0-9]+Z-.*\.log$//')
    fi
  fi

  if [ -z "$RUN_NAME" ]; then
    echo "Warning: Could not extract run name from log files, skipping comparison"
    export COMPARISON_OUTPUT=""
    export COMPARISON_EXIT_CODE=0
    export COMPARISON_FILE=""
    return 0
  fi

  echo "Run name: $RUN_NAME"

  # Build comparison command
  COMPARISON_CMD="yarn start compare-metrics \"$RUN_NAME\" \
    -e \"$PERF_ENTITY_COUNT\" \
    -l \"$PERF_LOGS_PER_ENTITY\" \
    --degradation-threshold \"$PERF_DEGRADATION_THRESHOLD\" \
    --warning-threshold \"$PERF_WARNING_THRESHOLD\" \
    --improvement-threshold \"$PERF_IMPROVEMENT_THRESHOLD\""

  # Add baseline file if specified
  if [ -n "${PERF_BASELINE_FILE:-}" ]; then
    COMPARISON_CMD="$COMPARISON_CMD -b \"$PERF_BASELINE_FILE\""
    echo "Using baseline: $PERF_BASELINE_FILE"
  else
    echo "Tool will find relevant baseline automatically"
  fi

  # Run comparison
  COMPARISON_FILE=$(mktemp)
  set +e
  eval "$COMPARISON_CMD" > "$COMPARISON_FILE" 2>&1
  COMPARISON_EXIT_CODE=$?
  set -e

  COMPARISON_OUTPUT=$(cat "$COMPARISON_FILE" 2>/dev/null || echo "")
  
  # Strip ANSI escape codes (colors, cursor movements, etc.)
  # This removes sequences like [2K, [1G, [31m, [39m, etc.
  COMPARISON_OUTPUT=$(echo "$COMPARISON_OUTPUT" | sed -E 's/\x1b\[[0-9;]*[a-zA-Z]//g')

  export COMPARISON_OUTPUT
  export COMPARISON_EXIT_CODE
  export COMPARISON_FILE

  if [ $COMPARISON_EXIT_CODE -eq 0 ]; then
    echo "Baseline comparison completed successfully"
  else
    echo "Warning: Baseline comparison exited with code $COMPARISON_EXIT_CODE"
  fi
}

# If script is executed directly (not sourced), run the function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  compare_with_baseline
fi

