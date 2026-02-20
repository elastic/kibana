#!/usr/bin/env bash

set -euo pipefail

# Defend Workflows Scout E2E Tests
# Runs Scout/Playwright tests for Defend Workflows (endpoint management, response actions, artifacts, policy, RBAC, tamper protection).

source .buildkite/scripts/steps/functional/common.sh

CONFIG_PATH="x-pack/solutions/security/test/scout_defend_workflows/ui/parallel.playwright.config.ts"

# Run modes for Defend Workflows Scout (stateful; serverless can be added when config is ready)
RUN_MODES=(
  '--arch stateful --domain classic'
)

results=()
failedConfigs=()
FINAL_EXIT_CODE=0

upload_events_if_available() {
  local mode="$1"
  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
      echo "--- Upload Scout reporter events for Defend Workflows Scout ($mode)"
      set +e
      node scripts/scout.js upload-events --dontFailOnError
      set -e
      if [ -d ".scout/reports" ]; then
        for dir in .scout/reports/scout-playwright-*; do
          if [ -d "$dir" ] && [[ "$dir" != *"scout-playwright-test-failures-"* ]]; then
            rm -rf "$dir"
          fi
        done
      fi
    fi
  fi
}

echo "--- Defend Workflows Scout Tests"
echo "Config: $CONFIG_PATH"

for mode in "${RUN_MODES[@]}"; do
  echo "--- Running Defend Workflows Scout: $mode"
  set +e
  node scripts/scout.js run-tests --location local $mode --config "$CONFIG_PATH" --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
  EXIT_CODE=$?
  set -e

  if [[ $EXIT_CODE -eq 2 ]]; then
    echo "No tests found for Defend Workflows Scout ($mode)"
  elif [[ $EXIT_CODE -ne 0 ]]; then
    upload_events_if_available "$mode"
    failedConfigs+=("Defend Workflows Scout ($mode)")
    FINAL_EXIT_CODE=10
    echo "^^^ +++"
  fi
done

if [[ ${#failedConfigs[@]} -gt 0 ]]; then
  echo "Failed: ${failedConfigs[*]}"
  exit $FINAL_EXIT_CODE
fi
