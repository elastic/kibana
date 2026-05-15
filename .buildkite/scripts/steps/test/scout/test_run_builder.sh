#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/bootstrap.sh
.buildkite/scripts/setup_es_snapshot_cache.sh

if should_enable_fips; then
  export NODE_OPTIONS="${NODE_OPTIONS:-} --enable-fips --openssl-config=$HOME/nodejs.cnf"
fi

echo '--- Verify Playwright CLI is functional'
node scripts/scout run-playwright-test-check

echo '--- Update Scout Test Config Manifests'
# Updates **/test/scout/.meta (manifest) files. Those paths are excluded from affected-packages
# so they do not cause extra modules to be considered "changed" in the next step.
node scripts/scout.js update-test-config-manifests --concurrencyLimit 3

echo '--- Evaluate selective testing scope'
# PR builds: GITHUB_PR_MERGE_BASE is computed by set_git_merge_base() in util.sh.
# On-merge builds: falls back to HEAD~1 (parent of the merge commit).
if [[ -n "${GITHUB_PR_MERGE_BASE:-}" ]]; then
  echo "Merge base (PR): ${GITHUB_PR_MERGE_BASE}"
else
  echo "GITHUB_PR_MERGE_BASE not set — using HEAD~1 as merge base (on-merge build)"
fi
export AFFECTED_MERGE_BASE="${GITHUB_PR_MERGE_BASE:-HEAD~1}"

mkdir -p .scout
export AFFECTED_MODULES_FILE=".scout/affected_modules.json"

# Computes affected modules (writes AFFECTED_MODULES_FILE) and checks whether
# any critical Scout files were touched.
SCOUT_CRITICAL_FILES_TOUCHED=$(ts-node "$(dirname "${0}")/resolve_selective_testing.ts")
echo "Critical Scout files touched: ${SCOUT_CRITICAL_FILES_TOUCHED}"

if [[ "${SELECTIVE_TESTING_ENABLED:-}" == "true" ]] \
  && ! is_pr_with_label "scout:run-all-tests" \
  && [[ "$SCOUT_CRITICAL_FILES_TOUCHED" != "true" ]]; then
  echo '--- Selective testing: ON'
  RUN_WITH_SELECTIVE_TESTING="true"
else
  echo '--- Selective testing: OFF'
  RUN_WITH_SELECTIVE_TESTING="false"
fi
echo "Decision made based on the following signals:
  • SELECTIVE_TESTING_ENABLED=${SELECTIVE_TESTING_ENABLED:-false}
  • 'scout:run-all-tests' GitHub label present: $(is_pr_with_label "scout:run-all-tests" && echo yes || echo no)
  • Critical Scout files touched: ${SCOUT_CRITICAL_FILES_TOUCHED}"

SCOUT_TEST_DISTRIBUTION_STRATEGY="${SCOUT_TEST_DISTRIBUTION_STRATEGY:-configs}"

if [[ "$SCOUT_TEST_DISTRIBUTION_STRATEGY" == "lanes" ]]; then
  echo '--- Update Scout Test Config Stats'
  node scripts/scout update-test-config-stats

  SELECTIVE_TESTING_FLAGS=()
  if [[ "${RUN_WITH_SELECTIVE_TESTING}" == "true" ]]; then
    SELECTIVE_TESTING_FLAGS=(--moduleFilterPath "$AFFECTED_MODULES_FILE")
  fi

  echo '--- Create Test Tracks'
  SERVERLESS_TARGETS=(
    local-serverless-search
    local-serverless-observability_complete
    local-serverless-observability_logs_essentials
    local-serverless-security_complete
    local-serverless-security_essentials
    local-serverless-security_ease
    local-serverless-vectordb
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
    --estimatedLaneSetupMinutes "${SCOUT_TEST_LANE_ESTIMATED_SETUP_MINUTES:-5}" \
    --targetRuntimeMinutes "${SCOUT_TEST_LANE_TARGET_RUNTIME_MINUTES:-15}" \
    "${TEST_TARGET_FLAGS[@]}" \
    "${SELECTIVE_TESTING_FLAGS[@]}" \
    --showMultiTrackSummary
else
  if [[ "${BUILDKITE_BRANCH:-}" == "main" || "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-}" == "main" ]]; then
    SCOUT_DISCOVERY_TARGET="local"
  else
    SCOUT_DISCOVERY_TARGET="local-stateful-only"
  fi

  echo "--- Discover Playwright Configs and upload to Buildkite artifacts (affected modules detected)"
  SELECTIVE_SCOUT_DISCOVERY_FLAG=()
  if [[ "${RUN_WITH_SELECTIVE_TESTING}" == "true" ]]; then
    SELECTIVE_SCOUT_DISCOVERY_FLAG=(--selective-testing)
    echo "The '--selective-testing' flag will be passed to discover-playwright-configs" \
         " because selective testing is enabled."
  fi
  node scripts/scout discover-playwright-configs \
    --include-custom-servers \
    --target "$SCOUT_DISCOVERY_TARGET" \
    --affected-modules "$AFFECTED_MODULES_FILE" \
    "${SELECTIVE_SCOUT_DISCOVERY_FLAG[@]}" \
    --save
  cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
  buildkite-agent artifact upload "scout_playwright_configs.json"
  upload_tmp_artifact scout_playwright_configs.json scout_playwright_configs.json "$BUILDKITE_BUILD_ID"
fi

source .buildkite/scripts/steps/test/scout/upload_report_events.sh

echo '--- Producing Scout Test Execution Steps'
ts-node "$(dirname "${0}")/test_run_builder.ts"

echo '--- Upload scout test run order artifacts to GCS'
if [[ -f scout_playwright_configs_scheduled.json ]]; then
  upload_tmp_artifact scout_playwright_configs_scheduled.json scout_playwright_configs_scheduled.json "$BUILDKITE_BUILD_ID"
fi

if [[ -f .scout/test_lane_loads.json ]]; then
  upload_tmp_artifact .scout/test_lane_loads.json .scout/test_lane_loads.json "$BUILDKITE_BUILD_ID"
fi
