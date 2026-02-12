#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

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
  echo "Missing SCOUT_SERVER_RUN_FLAGS env var"
  exit 1
fi

config_path="$SCOUT_CONFIG"
config_run_modes="$SCOUT_SERVER_RUN_FLAGS"
passed_count=0
failedModes=()

FINAL_EXIT_CODE=0

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
echo "   Modes: $(echo "$config_run_modes" | tr '\n' ' ')"

while read -r mode; do
  if [[ -z "$mode" ]]; then
    continue
  fi

  echo "--- Running tests: $config_path ($mode)"

  start=$(date +%s)

  # prevent non-zero exit code from breaking the loop
  set +e;
  node scripts/scout run-tests "$mode" --config "$config_path" --kibana-install-dir "$KIBANA_BUILD_LOCATION"
  EXIT_CODE=$?
  set -e;

  if [[ $EXIT_CODE -ne 0 ]]; then
    failedModes+=("$mode")
    FINAL_EXIT_CODE=10  # Ensure we exit with failure if any test fails with (exit code 10 to match FTR)
    echo "Scout test exited with code $EXIT_CODE for $config_path ($mode)"
    echo "^^^ +++"
  else
    passed_count=$((passed_count + 1))
  fi

done <<< "$config_run_modes"

if [[ ${#failedModes[@]} -gt 0 ]]; then
  run_failed_test_reporter_and_annotate
fi

echo "--- Scout Test Run Complete: passed=${passed_count} failed=${#failedModes[@]}"

if [[ ${#failedModes[@]} -gt 0 ]]; then
  echo "❌ Failed modes:"
  for mode in "${failedModes[@]}"; do
    echo "  $mode ❌"
  done
fi

exit $FINAL_EXIT_CODE  # Exit with 10 only if there were config failures
