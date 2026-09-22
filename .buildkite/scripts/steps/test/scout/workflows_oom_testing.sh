#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

CONFIG_PATH="src/platform/plugins/shared/workflows_management/test/scout_workflows_oom_testing/api/playwright.config.ts"

echo "--- Workflow Schema OOM Prevention Test"
echo "Config: $CONFIG_PATH"
echo "Server config set: workflows_oom_testing (1 GB Kibana heap)"

RUN_MODES=(
  "--arch stateful --domain classic"
  "--arch serverless --domain security_complete"
  "--arch serverless --domain search"
  "--arch serverless --domain observability_complete"
)

for mode in "${RUN_MODES[@]}"; do
  echo "--- Running OOM prevention test: $mode"

  start=$(date +%s)

  set +e
  node scripts/scout run-tests --location local --serverConfigSet workflows_oom_testing $mode --config "$CONFIG_PATH" --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
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

  if [[ $EXIT_CODE -eq 0 ]]; then
    echo "Passed ($duration)"
  else
    echo "Failed with exit code $EXIT_CODE ($duration)"
    exit $EXIT_CODE
  fi
done
