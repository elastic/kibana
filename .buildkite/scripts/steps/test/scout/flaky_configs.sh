#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

# Each step planned by `pick_scout_flaky_run_order.ts` runs a single (arch, domain) mode for
# one Scout config. The planner is the sole caller of this script, so both env vars are
# required and the previous mode-loop / manifest-download logic has been removed.

SCOUT_CONFIG=${SCOUT_CONFIG:-}
SCOUT_SERVER_RUN_FLAGS=${SCOUT_SERVER_RUN_FLAGS:-}

if [[ -z "${SCOUT_REPORTER_ENABLED:-}" ]]; then
  export SCOUT_REPORTER_ENABLED=true
  echo "⚠️ SCOUT_REPORTER_ENABLED not set; defaulting to true for flaky runner"
fi

if [[ -z "$SCOUT_CONFIG" ]]; then
  echo "Missing SCOUT_CONFIG env var"
  exit 1
fi

if [[ -z "$SCOUT_SERVER_RUN_FLAGS" ]]; then
  echo "Missing SCOUT_SERVER_RUN_FLAGS env var (expected one '--arch X --domain Y' pair)"
  exit 1
fi

# Normalize optional leading "./" so logs match planner-emitted labels.
config_path="${SCOUT_CONFIG#./}"
mode="$SCOUT_SERVER_RUN_FLAGS"

run_failed_test_reporter_and_annotate() {
  if ! ls .scout/reports/scout-playwright-test-failures-*/scout-failures-*.ndjson >/dev/null 2>&1; then
    return
  fi

  local build_url="${BUILDKITE_BUILD_URL:-${BUILD_URL:-}}"
  if [[ -z "$build_url" ]]; then
    echo "⚠️ Missing BUILDKITE_BUILD_URL/BUILD_URL; skipping failed test reporter"
    return
  fi

  echo "--- Run Failed Test Reporter"
  # prevent failures from breaking the script
  set +e;
  node scripts/report_failed_tests --build-url="${build_url}#${BUILDKITE_JOB_ID}" \
    '.scout/reports/scout-playwright-test-failures-*/scout-failures-*.ndjson' \
    --no-github-update --no-index-errors
  local report_exit_code=$?
  set -e;

  if [[ $report_exit_code -ne 0 ]]; then
    echo "⚠️ Failed Test Reporter exited with code ${report_exit_code}"
  fi

  if [[ ! -d 'target/test_failures' ]]; then
    return
  fi

  buildkite-agent artifact upload 'target/test_failures/**/*'
  ts-node .buildkite/scripts/lifecycle/annotate_test_failures.ts
}

echo "--- Config: $config_path"
echo "    Mode:   $mode"
echo "--- Running tests: $config_path ($mode)"

# prevent non-zero exit code from breaking the script before reporting runs
set +e;
node scripts/scout run-tests $mode --config "$config_path" --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
EXIT_CODE=$?
set -e;

if [[ $EXIT_CODE -eq 0 ]]; then
  echo "--- Scout Test Run Complete: $config_path ($mode) ✅"
  exit 0
fi

echo "Scout test exited with code $EXIT_CODE for $config_path ($mode)"
echo "^^^ +++"

run_failed_test_reporter_and_annotate

echo "--- Scout Test Run Complete: $config_path ($mode) ❌"
# Use exit code 10 to match FTR's convention for "tests failed" (vs. infra/setup failure).
exit 10
