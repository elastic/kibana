#!/usr/bin/env bash

set -euo pipefail

# CSPM Agentless Scout E2E Tests
# Runs Scout tests with custom server configuration for Cloud Security Posture Management (CSPM) agentless integrations

source .buildkite/scripts/steps/functional/common.sh

CONFIG_PATH="x-pack/solutions/security/plugins/cloud_security_posture/test/scout_cspm_agentless/ui/parallel.playwright.config.ts"

# Run modes for CSPM Agentless tests (each element: --arch X --domain Y)
RUN_MODES=(
  '--arch stateful --domain classic'
  '--arch serverless --domain security_complete'
)

results=()
failedConfigs=()

FINAL_EXIT_CODE=0

# Function to upload Scout events if available and clean up
upload_events_if_available() {
  local mode="$1"

  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
      echo "--- Upload Scout reporter events for CSPM Agentless ($mode)"
      set +e
      node scripts/scout upload-events --dontFailOnError
      UPLOAD_EXIT_CODE=$?
      set -e

      if [[ $UPLOAD_EXIT_CODE -eq 0 ]]; then
        echo "Upload completed for CSPM Agentless ($mode)"
      else
        echo "Upload failed for CSPM Agentless ($mode) with exit code $UPLOAD_EXIT_CODE"
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
      echo "No Scout reports found for CSPM Agentless ($mode)"
    fi
  fi
}

echo "--- CSPM Agentless Scout Tests"
echo "Config: $CONFIG_PATH"
echo "Run modes: ${RUN_MODES[*]}"

for mode in "${RUN_MODES[@]}"; do
  echo "--- Running CSPM Agentless tests: $mode"

  start=$(date +%s)

  # Prevent non-zero exit code from breaking the loop
  set +e
  node scripts/scout run-tests --location local $mode --config "$CONFIG_PATH" --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
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
    # No tests found
    echo "No tests found for CSPM Agentless ($mode)"
  elif [[ $EXIT_CODE -ne 0 ]]; then
    # Test run failed
    upload_events_if_available "$mode"
    failedConfigs+=("CSPM Agentless ($mode)")
    FINAL_EXIT_CODE=10
    echo "Scout test exited with code $EXIT_CODE for CSPM Agentless ($mode)"
    echo "^^^ +++"
  else
    # Test run was successful
    upload_events_if_available "$mode"
    results+=("CSPM Agentless ($mode) (${duration})")
  fi
done

echo "--- CSPM Agentless Scout Tests: Summary"
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

