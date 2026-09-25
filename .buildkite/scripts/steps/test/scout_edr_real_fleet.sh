#!/usr/bin/env bash

set -euo pipefail

# Live Elastic Defend Scout: Docker Fleet Server + Endpoint VM (Vagrant/VirtualBox).
# Must not run in the default Scout lane — see scout_ci_config.yml excluded_configs.

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/ensure_virtualbox.sh

CONFIG_PATH="x-pack/solutions/security/plugins/security_solution/test/scout_edr_real_fleet/ui/playwright.config.ts"
MODE='--arch stateful --domain classic'

upload_events_if_available() {
  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
      echo "--- Upload Scout reporter events for EDR Real Fleet"
      set +e
      node scripts/scout upload-events --dontFailOnError
      UPLOAD_EXIT_CODE=$?
      set -e

      if [[ $UPLOAD_EXIT_CODE -eq 0 ]]; then
        echo "Upload completed for EDR Real Fleet"
      else
        echo "Upload failed for EDR Real Fleet with exit code $UPLOAD_EXIT_CODE"
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
      echo "No Scout reports found for EDR Real Fleet"
    fi
  fi
}

echo "--- Scout EDR Real Fleet Tests"
echo "Config: $CONFIG_PATH"
echo "Mode: $MODE"

start=$(date +%s)

set +e
node scripts/scout run-tests --location local $MODE --config "$CONFIG_PATH" --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
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
  echo "No tests found for EDR Real Fleet"
  echo "^^^ +++"
  exit 10
fi

upload_events_if_available

if [[ $EXIT_CODE -ne 0 ]]; then
  echo "Scout test exited with code $EXIT_CODE for EDR Real Fleet (${duration})"
  echo "^^^ +++"
  exit 10
fi

echo "EDR Real Fleet passed (${duration})"
exit 0
