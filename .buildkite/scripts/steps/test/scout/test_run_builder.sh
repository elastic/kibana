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

  # PR builds: GITHUB_PR_MERGE_BASE is computed by set_git_merge_base() in util.sh.
  # On-merge builds: falls back to HEAD~1 (parent of the merge commit).
  if [[ -n "${GITHUB_PR_MERGE_BASE:-}" ]]; then
    echo "Merge base (PR): ${GITHUB_PR_MERGE_BASE}"
  else
    echo "GITHUB_PR_MERGE_BASE not set — using HEAD~1 as merge base (on-merge build)"
  fi
  export AFFECTED_MERGE_BASE="${GITHUB_PR_MERGE_BASE:-HEAD~1}"

  mkdir -p .scout
  export CODE_CHANGES_FILE=".scout/code_changes.json"

  # Debug override: when SCOUT_CODE_CHANGES_OVERRIDE points at an existing JSON
  # file, skip the resolver and use that file as the code-changes input. Useful
  # for verifying the tests-only / dependency-tree branches on demand without
  # crafting a real diff. Path is repo-relative.
  if [[ -n "${SCOUT_CODE_CHANGES_OVERRIDE:-}" && -f "${SCOUT_CODE_CHANGES_OVERRIDE}" ]]; then
    echo "Selective testing: using override code-changes from ${SCOUT_CODE_CHANGES_OVERRIDE}"
    cp "${SCOUT_CODE_CHANGES_OVERRIDE}" "$CODE_CHANGES_FILE"
  else
    # Build the generic code-changes file (changed files + affected @kbn/ modules)
    # that the Scout CLI will use to auto-select between the tests-only fast path
    # and the dependency-tree fallback.
    ts-node "$(dirname "${0}")/resolve_selective_testing.ts"
  fi

  echo "--- Discover Playwright Configs and upload to Buildkite artifacts"
  SELECTIVE_SCOUT_DISCOVERY_FLAG=()
  if [[ "${SELECTIVE_TESTING_ENABLED:-}" == "true" ]] \
    && ! is_pr_with_label "scout:run-all-tests"; then
    SELECTIVE_SCOUT_DISCOVERY_FLAG=(--selective-testing)
    echo "Selective testing: enabled (Scout CLI will auto-select tests-only / dependency-tree mode based on the diff)"
  else
    echo "Selective testing: disabled"
    echo "Reason: SELECTIVE_TESTING_ENABLED=${SELECTIVE_TESTING_ENABLED:-false}, 'scout:run-all-tests' label=$(is_pr_with_label "scout:run-all-tests" && echo yes || echo no)"
  fi
  node scripts/scout discover-playwright-configs \
    --include-custom-servers \
    --target "$SCOUT_DISCOVERY_TARGET" \
    --code-changes "$CODE_CHANGES_FILE" \
    "${SELECTIVE_SCOUT_DISCOVERY_FLAG[@]}" \
    --save
  cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
  buildkite-agent artifact upload "scout_playwright_configs.json"
  buildkite-agent artifact upload "$CODE_CHANGES_FILE"
fi

source .buildkite/scripts/steps/test/scout/upload_report_events.sh

echo '--- Producing Scout Test Execution Steps'
ts-node "$(dirname "${0}")/test_run_builder.ts"
