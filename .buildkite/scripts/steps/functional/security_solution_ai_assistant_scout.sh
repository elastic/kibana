#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

CONFIG_PATH="x-pack/solutions/security/plugins/security_solution/test/scout/ui/ai_assistant.playwright.config.ts"

if [[ -z "${SCOUT_AI_ASSISTANT_MODE:-}" ]]; then
  echo "Missing SCOUT_AI_ASSISTANT_MODE env var (e.g. '--arch stateful --domain classic')"
  exit 1
fi

mode="$SCOUT_AI_ASSISTANT_MODE"

results=()
failedConfigs=()

FINAL_EXIT_CODE=0

upload_events_if_available() {
  local run_mode="$1"

  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
      echo "--- Upload Scout reporter events for AI Assistant ($run_mode)"
      set +e
      node scripts/scout upload-events --dontFailOnError
      UPLOAD_EXIT_CODE=$?
      set -e

      if [[ $UPLOAD_EXIT_CODE -eq 0 ]]; then
        echo "Upload completed for AI Assistant ($run_mode)"
      else
        echo "Upload failed for AI Assistant ($run_mode) with exit code $UPLOAD_EXIT_CODE"
      fi

      echo "Cleaning up Scout events reports (preserving failure reports for annotations)"
      if [ -d ".scout/reports" ]; then
        for dir in .scout/reports/scout-playwright-*; do
          if [ -d "$dir" ] && [[ "$dir" != *"scout-playwright-test-failures-"* ]]; then
            rm -rf "$dir"
          fi
        done
      fi
    else
      echo "No Scout reports found for AI Assistant ($run_mode)"
    fi
  fi
}

echo "--- AI Assistant Scout Tests ($mode)"
echo "Config: $CONFIG_PATH"

start=$(date +%s)

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
  echo "No tests found for AI Assistant ($mode)"
elif [[ $EXIT_CODE -ne 0 ]]; then
  upload_events_if_available "$mode"
  failedConfigs+=("AI Assistant ($mode)")
  FINAL_EXIT_CODE=10
  echo "Scout test exited with code $EXIT_CODE for AI Assistant ($mode)"
  echo "^^^ +++"
else
  upload_events_if_available "$mode"
  results+=("AI Assistant ($mode) (${duration})")
fi

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
