#!/usr/bin/env bash

set -euo pipefail

# AI Assistant - Security Solution Scout E2E Tests
# Runs Scout tests for AI Assistant with both stateful and serverless=security modes

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

CONFIG_PATH="x-pack/solutions/security/plugins/security_solution/test/scout/ui/ai_assistant.playwright.config.ts"

# Run modes for AI Assistant tests
RUN_MODES="--stateful --serverless=security"

results=()
failedConfigs=()

FINAL_EXIT_CODE=0

# Function to upload Scout events if available and clean up
upload_events_if_available() {
  local mode="$1"

  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
      echo "--- Upload Scout reporter events for AI Assistant ($mode)"
      set +e
      node scripts/scout upload-events --dontFailOnError
      UPLOAD_EXIT_CODE=$?
      set -e

      if [[ $UPLOAD_EXIT_CODE -eq 0 ]]; then
        echo "Upload completed for AI Assistant ($mode)"
      else
        echo "Upload failed for AI Assistant ($mode) with exit code $UPLOAD_EXIT_CODE"
      fi

      # Clean up events reports to avoid double ingestion, but preserve failure reports
      echo "Cleaning up Scout events reports (preserving failure reports for annotations)"
      if [ -d ".scout/reports" ]; then
        for dir in .scout/reports/scout-playwright-*; do
          if [ -d "$dir" ] && [[ "$dir" != *"scout-playwright-test-failures-"* ]]; then
            rm -rf "$dir"
          fi
        done
      fi
    else
      echo "No Scout reports found for AI Assistant ($mode)"
    fi
  fi
}

echo "--- AI Assistant - Security Solution Scout Tests"
echo "Config: $CONFIG_PATH"
echo "Run modes: $RUN_MODES"

for mode in $RUN_MODES; do
  echo "--- Running AI Assistant tests: $mode"

  start=$(date +%s)

  # Prevent non-zero exit code from breaking the loop
  set +e
  node scripts/scout.js run-tests "$mode" --config "$CONFIG_PATH" --kibana-install-dir "$KIBANA_BUILD_LOCATION"
  EXIT_CODE=$?
  set -e

  timeSec=$(($(date +%s)-start))
  if [[ $timeSec -gt 60 ]]; then
    min=$((timeSec/60))
    sec=$((timeSec-(min*60)))
    duration="${min}m ${sec}s"
  else
    duration="${timeSec}s"
  fi

  if [[ $EXIT_CODE -eq 2 ]]; then
    # No tests found for this mode
    echo "No tests found for AI Assistant ($mode)"
  elif [[ $EXIT_CODE -ne 0 ]]; then
    # Test run failed
    upload_events_if_available "$mode"
    failedConfigs+=("AI Assistant ($mode)")
    FINAL_EXIT_CODE=10
    echo "Scout test exited with code $EXIT_CODE for AI Assistant ($mode)"
    echo "^^^ +++"
  else
    # Test run was successful
    upload_events_if_available "$mode"
    results+=("AI Assistant ($mode) (${duration})")
  fi
done

echo "--- AI Assistant Scout Tests: Summary"
echo "Passed: ${#results[@]}"
echo "Failed: ${#failedConfigs[@]}"

if [[ ${#results[@]} -gt 0 ]]; then
  echo "Successful tests:"
  printf '%s\n' "${results[@]}"
fi

if [[ ${#failedConfigs[@]} -gt 0 ]]; then
  echo "Failed tests:"
  for config in "${failedConfigs[@]}"; do
    echo "  $config"
  done
fi

exit $FINAL_EXIT_CODE
