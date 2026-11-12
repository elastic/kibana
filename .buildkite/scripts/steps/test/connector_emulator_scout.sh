#!/usr/bin/env bash

set -euo pipefail

# Scout suites that run connector actions through Kibana against the connector emulator, which
# stands in for the vendors: Kibana sends its connector requests through it (server config set
# `connector_emulator`, derived from the `test/scout_connector_emulator` path of the config).
# Must not run in the default Scout lane (no emulator there) — see scout_ci_config.yml.
#
# The emulator has to be running, and to have created its CA, before the Scout servers start, as
# Kibana trusts the CA only if it exists when Kibana starts.
#
# On pull requests this runs against the Kibana build the pipeline made. The weekly connector
# pipeline has no build, so it sets CONNECTOR_EMULATOR_SCOUT_FROM_SOURCE=true to run Kibana from
# source, and CONNECTOR_EMULATOR_SPEC=latest to serve the vendors' current specs instead of the
# committed snapshots, which is what finds a vendor change that breaks a connector.

if [[ "${CONNECTOR_EMULATOR_SCOUT_FROM_SOURCE:-}" == "true" ]]; then
  source .buildkite/scripts/common/util.sh
  .buildkite/scripts/bootstrap.sh
  .buildkite/scripts/setup_es_snapshot_cache.sh
  kibana_args=()
else
  source .buildkite/scripts/steps/functional/common.sh
  kibana_args=(--kibanaInstallDir "$KIBANA_BUILD_LOCATION")
fi

# The suites that run connectors against the emulator, which scout_ci_config.yml keeps out of the
# Scout lanes. Each run starts its own Kibana and Elasticsearch, and the emulator serves them all.
CONFIG_PATHS=(
  "src/platform/packages/shared/kbn-connector-specs/test/scout_connector_emulator/api/playwright.config.ts"
  "src/platform/plugins/shared/workflows_management/test/scout_connector_emulator/ui/parallel.playwright.config.ts"
)
# The connectors those suites run, by the emulator's name for them: the connector id without the
# dot. Add a connector here when adding a suite for it.
CONNECTORS="firecrawl,brave-search,shodan,censys,jina,figma"
EMULATOR_SPEC="${CONNECTOR_EMULATOR_SPEC:-snapshot}"
EMULATOR_LOG="target/connector_emulator.log"

mkdir -p "$(dirname "$EMULATOR_LOG")"

upload_events_if_available() {
  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
      echo "--- Upload Scout reporter events for Connector Emulator"
      set +e
      node scripts/scout upload-events --dontFailOnError
      UPLOAD_EXIT_CODE=$?
      set -e

      if [[ $UPLOAD_EXIT_CODE -eq 0 ]]; then
        echo "Upload completed for Connector Emulator"
      else
        echo "Upload failed for Connector Emulator with exit code $UPLOAD_EXIT_CODE"
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
      echo "No Scout reports found for Connector Emulator"
    fi
  fi
}

stop_emulator() {
  if [[ -n "${EMULATOR_PID:-}" ]] && kill -0 "$EMULATOR_PID" 2>/dev/null; then
    kill "$EMULATOR_PID" 2>/dev/null || true
    wait "$EMULATOR_PID" 2>/dev/null || true
  fi
  # What the emulator saw is what to read when a suite fails
  buildkite-agent artifact upload "$EMULATOR_LOG" || true
}

echo "--- Start the connector emulator ($CONNECTORS, $EMULATOR_SPEC specs)"
node scripts/connector_emulate --connector "$CONNECTORS" --spec "$EMULATOR_SPEC" > "$EMULATOR_LOG" 2>&1 &
EMULATOR_PID=$!
trap stop_emulator EXIT

emulator_ready=false
for _ in $(seq 1 90); do
  if grep -q "now running" "$EMULATOR_LOG"; then
    emulator_ready=true
    break
  fi
  if ! kill -0 "$EMULATOR_PID" 2>/dev/null; then
    break
  fi
  sleep 2
done
if [[ "$emulator_ready" != "true" ]]; then
  echo "The connector emulator didn't start:"
  cat "$EMULATOR_LOG"
  exit 10
fi
grep -E "now running|proxyUrl" "$EMULATOR_LOG" || true

FINAL_EXIT_CODE=0
results=()
failedConfigs=()

for CONFIG_PATH in "${CONFIG_PATHS[@]}"; do
  echo "--- Scout Connector Emulator Tests: $CONFIG_PATH"

  start=$(date +%s)

  set +e
  node scripts/scout run-tests --location local --arch stateful --domain classic --config "$CONFIG_PATH" "${kibana_args[@]}"
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
    echo "No tests found for Connector Emulator ($CONFIG_PATH, ${duration})"
    echo "^^^ +++"
    failedConfigs+=("$CONFIG_PATH (no tests)")
    FINAL_EXIT_CODE=10
  elif [[ $EXIT_CODE -ne 0 ]]; then
    echo "Scout test exited with code $EXIT_CODE for Connector Emulator ($CONFIG_PATH, ${duration})"
    echo "^^^ +++"
    failedConfigs+=("$CONFIG_PATH")
    FINAL_EXIT_CODE=10
  else
    results+=("$CONFIG_PATH (${duration})")
  fi
done

echo "--- Scout Connector Emulator Tests: Summary"
echo "Passed: ${#results[@]}"
echo "Failed: ${#failedConfigs[@]}"
if [[ ${#results[@]} -gt 0 ]]; then
  echo "Successful tests:"
  printf '%s\n' "${results[@]}"
fi
if [[ ${#failedConfigs[@]} -gt 0 ]]; then
  echo "Failed tests:"
  printf '  %s\n' "${failedConfigs[@]}"
fi

exit $FINAL_EXIT_CODE
