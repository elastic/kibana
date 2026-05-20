#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/bootstrap.sh
.buildkite/scripts/setup_es_snapshot_cache.sh

echo '--- Verify Playwright CLI is functional'
node scripts/scout run-playwright-test-check

echo '--- Update Scout Test Config Manifests'
# Updates **/test/scout/.meta (manifest) files. Those paths are excluded from affected-packages
# so they do not cause extra modules to be considered "changed" in the next step.
node scripts/scout.js update-test-config-manifests --concurrencyLimit 3

# Resolve Scout's selective-testing scope once, before either distribution
# strategy runs. Both artifacts produced below (code_changes.json and
# testing_scope.json) are consumed by the configs/lanes branches further down
# and by other pipeline steps (e.g. FTR/Jest run-order pick).

# PR builds: GITHUB_PR_MERGE_BASE is computed by set_git_merge_base() in util.sh.
# On-merge builds: falls back to HEAD~1 (parent of the merge commit).
if [[ -n "${GITHUB_PR_MERGE_BASE:-}" ]]; then
  echo "Merge base (PR): ${GITHUB_PR_MERGE_BASE}"
else
  echo "GITHUB_PR_MERGE_BASE not set — using HEAD~1 as merge base (on-merge build)"
fi
AFFECTED_MERGE_BASE="${GITHUB_PR_MERGE_BASE:-HEAD~1}"

mkdir -p .scout
CODE_CHANGES_FILE=".scout/code_changes.json"
export TESTING_SCOPE_FILE=".scout/testing_scope.json"

echo '--- Resolve Scout selective-testing scope'

# Build the generic code-changes file (changed files + affected @kbn/ modules)
# consumed by `scout resolve-testing-scope` below.
ts-node "$(dirname "${0}")/resolve_selective_testing.ts" \
  "$AFFECTED_MERGE_BASE" \
  "$CODE_CHANGES_FILE"

# Decide the scope once (full / tests-only / dependency-tree) so every
# downstream step uses the same decision.
SELECTIVE_SCOUT_FLAG=()
if [[ "${SELECTIVE_TESTING_ENABLED:-}" == "true" ]] \
  && ! is_pr_with_label "scout:run-all-tests"; then
  SELECTIVE_SCOUT_FLAG=(--selective-testing)
  echo "Selective testing: enabled (Scout CLI will auto-select tests-only / dependency-tree mode based on the diff)"
else
  echo "Selective testing: disabled"
  echo "Reason: SELECTIVE_TESTING_ENABLED=${SELECTIVE_TESTING_ENABLED:-false}, 'scout:run-all-tests' label=$(is_pr_with_label "scout:run-all-tests" && echo yes || echo no)"
fi

node scripts/scout resolve-testing-scope \
  --code-changes "$CODE_CHANGES_FILE" \
  --scope-output "$TESTING_SCOPE_FILE" \
  "${SELECTIVE_SCOUT_FLAG[@]}"

buildkite-agent artifact upload "$CODE_CHANGES_FILE"
# Consumed by the configs/lanes branches below. The Jest/FTR "Pick Test Group
# Run Order" step computes its own scope independently, so it does not need
# this artifact.
buildkite-agent artifact upload "$TESTING_SCOPE_FILE"

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
    --testing-scope "$TESTING_SCOPE_FILE" \
    "${TEST_TARGET_FLAGS[@]}" \
    --showMultiTrackSummary
else
  if [[ "${BUILDKITE_BRANCH:-}" == "main" || "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-}" == "main" ]]; then
    SCOUT_DISCOVERY_TARGET="local"
  else
    SCOUT_DISCOVERY_TARGET="local-stateful-only"
  fi

  echo "--- Discover Playwright Configs and upload to Buildkite artifacts"
  node scripts/scout discover-playwright-configs \
    --include-custom-servers \
    --target "$SCOUT_DISCOVERY_TARGET" \
    --testing-scope "$TESTING_SCOPE_FILE" \
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
