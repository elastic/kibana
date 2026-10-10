#!/usr/bin/env bash

set -euo pipefail

# Fleet Scout tests with a real Elastic Agent: Docker Fleet Server + Docker Elastic Agent containers.
# Must not run in the default Scout lane (no Docker Fleet Server there) — see scout_ci_config.yml excluded_configs.

source .buildkite/scripts/steps/functional/common.sh

CONFIG_PATH="x-pack/platform/plugins/shared/fleet/test/scout_fleet_real_agent/api/playwright.config.ts"

upload_events_if_available() {
  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
      echo "--- Upload Scout reporter events for Fleet Real Agent"
      set +e
      node scripts/scout upload-events --dontFailOnError
      UPLOAD_EXIT_CODE=$?
      set -e

      if [[ $UPLOAD_EXIT_CODE -eq 0 ]]; then
        echo "Upload completed for Fleet Real Agent"
      else
        echo "Upload failed for Fleet Real Agent with exit code $UPLOAD_EXIT_CODE"
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
      echo "No Scout reports found for Fleet Real Agent"
    fi
  fi
}

echo "--- Scout Fleet Real Agent Tests"
echo "Config: $CONFIG_PATH"

start=$(date +%s)

set +e
node scripts/scout run-tests --location local --arch stateful --domain classic --serverConfigSet fleet_real_agent --config "$CONFIG_PATH" --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
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

upload_events_if_available

if [[ $EXIT_CODE -eq 2 ]]; then
  echo "No tests found for Fleet Real Agent ($CONFIG_PATH, ${duration})"
  echo "^^^ +++"
  exit 10
elif [[ $EXIT_CODE -ne 0 ]]; then
  echo "Scout test exited with code $EXIT_CODE for Fleet Real Agent ($CONFIG_PATH, ${duration})"
  echo "^^^ +++"
  exit 10
fi

echo "Fleet Real Agent passed for $CONFIG_PATH (${duration})"
