#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Verify Playwright CLI is functional'
node scripts/scout run-playwright-test-check

echo '--- Update Scout Test Config Manifests'
# Updates **/test/scout/.meta (manifest) files. Those paths are excluded from affected-packages
# so they do not cause extra modules to be considered "changed" in the next step.
node scripts/scout.js update-test-config-manifests --concurrencyLimit 3

SCOUT_TEST_DISTRIBUTION_STRATEGY="${SCOUT_TEST_DISTRIBUTION_STRATEGY:-configs}"

if [[ "$SCOUT_TEST_DISTRIBUTION_STRATEGY" == "lanes" ]]; then
  echo '--- Update Scout Test Config Stats'
  node scripts/scout update-test-config-stats

  echo '--- Create Test Tracks'
  SERVERLESS_TARGETS=(
    local-serverless-search
    local-serverless-observability_complete
    local-serverless-observability_logs_essentials
    local-serverless-security_complete
    local-serverless-security_essentials
    local-serverless-security_ease
    local-serverless-workplaceai
  )

  TEST_TARGET_FLAGS=()

  if [[ -z "${SERVERLESS_TESTS_ONLY:-}" ]]; then
    TEST_TARGET_FLAGS+=(--testTarget local-stateful-classic)
  fi

  if [[ -n "${SERVERLESS_TESTS_ONLY:-}" || "${BUILDKITE_BRANCH:-}" == "main" || "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-}" == "main" ]]; then
    for target in "${SERVERLESS_TARGETS[@]}"; do
      TEST_TARGET_FLAGS+=(--testTarget "$target")
    done
  fi

  node scripts/scout create-test-tracks \
    --estimatedLaneSetupMinutes "${SCOUT_TEST_LANE_ESTIMATED_SETUP_MINUTES:-3}" \
    --targetRuntimeMinutes "${SCOUT_TEST_LANE_TARGET_RUNTIME_MINUTES:-15}" \
    "${TEST_TARGET_FLAGS[@]}" \
    --showMultiTrackSummary

else
  if [[ "${BUILDKITE_BRANCH:-}" == "main" || "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-}" == "main" ]]; then
    SCOUT_DISCOVERY_TARGET="local"
  else
    SCOUT_DISCOVERY_TARGET="local-stateful-only"
  fi

  AFFECTED_MODULES_FILE=""
  if [[ -n "${GITHUB_PR_MERGE_BASE:-}" ]] && [[ "${SELECTIVE_TESTING_ENABLED:-}" == "true" ]]; then
    mkdir -p .scout
    AFFECTED_MODULES_FILE=".scout/affected_modules.json"
    .buildkite/pipeline-utils/affected-packages/list_affected \
      --strategy git --deep --merge-base "$GITHUB_PR_MERGE_BASE" --json \
      > "$AFFECTED_MODULES_FILE"
  fi

  echo "--- Discover Playwright Configs and upload to Buildkite artifacts${AFFECTED_MODULES_FILE:+ (selective testing)}"
  AFFECTED_FLAG=()
  if [[ -n "$AFFECTED_MODULES_FILE" ]]; then
    AFFECTED_FLAG=(--affected-modules "$AFFECTED_MODULES_FILE")
  fi
  node scripts/scout discover-playwright-configs \
    --include-custom-servers \
    --target "$SCOUT_DISCOVERY_TARGET" \
    "${AFFECTED_FLAG[@]}" \
    --save
  cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
  buildkite-agent artifact upload "scout_playwright_configs.json"
fi

echo '--- Running Scout API Integration Tests'
node scripts/scout.js run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/packages/shared/kbn-scout/test/scout/api/playwright.config.ts \
  --kibanaInstallDir "$KIBANA_BUILD_LOCATION"

echo '--- Checking EUI Website Availability'
eui_check_exit=0
ts-node src/platform/packages/shared/kbn-scout/test/scout/scripts/check_eui_availability.ts || eui_check_exit=$?
if [ "$eui_check_exit" -eq 0 ]; then
  echo '--- Running Scout EUI Helpers Tests'
  SCOUT_TARGET_LOCATION='local' SCOUT_TARGET_ARCH='serverless' SCOUT_TARGET_DOMAIN='security_complete' \
  "${KIBANA_DIR:-$(pwd)}/node_modules/.bin/playwright" test \
    --project local \
    --grep serverless-security_complete \
    --config src/platform/packages/shared/kbn-scout/test/scout/ui/playwright.config.ts
else
  echo 'EUI website is not available - skipping EUI Helpers Tests'
fi

source .buildkite/scripts/steps/test/scout/upload_report_events.sh

echo '--- Producing Scout Test Execution Steps'
ts-node "$(dirname "${0}")/test_run_builder.ts"
