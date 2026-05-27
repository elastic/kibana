#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/test/ftr_smart_retry.sh
source .buildkite/scripts/steps/test/ftr_job_annotation.sh

BUILDKITE_PARALLEL_JOB=${BUILDKITE_PARALLEL_JOB:-}
FTR_CONFIG_GROUP_KEY=${FTR_CONFIG_GROUP_KEY:-}
if [ "$FTR_CONFIG_GROUP_KEY" == "" ] && [ "$BUILDKITE_PARALLEL_JOB" == "" ]; then
  echo "Missing FTR_CONFIG_GROUP_KEY env var"
  exit 1
fi

EXTRA_ARGS=${FTR_EXTRA_ARGS:-}
test -z "$EXTRA_ARGS" || buildkite-agent meta-data set "ftr-extra-args" "$EXTRA_ARGS"

export JOB="$FTR_CONFIG_GROUP_KEY"

FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${FTR_CONFIG_GROUP_KEY}"
FAILED_TESTS_KEY="${BUILDKITE_STEP_ID}${FTR_CONFIG_GROUP_KEY}_failed_tests"

exitCode=0
annotation_rows=()
failure_detail_lines=()
retry_recovered=false

configs="${FTR_CONFIG:-}"

# The first retry should only run the configs that failed in the previous attempt.
# Any subsequent retries (generally triggered manually) will run everything.
if [[ ! "$configs" && "${BUILDKITE_RETRY_COUNT:-0}" == "1" ]]; then
  configs=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')
  if [[ "$configs" ]]; then
    echo "--- Retrying only failed configs"
    echo "$configs"
  fi
fi

if [ "$configs" == "" ] && [ "$FTR_CONFIG_GROUP_KEY" != "" ]; then
  echo "--- downloading ftr test run order"
  download_tmp_artifact ftr_run_order.json . "$BUILDKITE_BUILD_ID"
  configs=$(jq -r '.[env.FTR_CONFIG_GROUP_KEY].names[]' ftr_run_order.json)
fi

if [ "$configs" == "" ]; then
  echo "unable to determine configs to run"
  exit 1
fi

failedConfigs=""
results=()

# Capture which configs failed in the previous attempt before the meta-data key is overwritten below.
prevRunFailedConfigs=""
if [[ "${BUILDKITE_RETRY_COUNT:-0}" -ge "1" ]]; then
  prevRunFailedConfigs=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '' 2>/dev/null || true)
fi

while read -r config; do
  if [[ ! "$config" ]]; then
    continue;
  fi

  FULL_COMMAND="node scripts/functional_tests --config $config $EXTRA_ARGS"

  # see if this config has already been executed successfully
  CONFIG_EXECUTION_KEY="${config}_executed"
  IS_CONFIG_EXECUTION=$(buildkite-agent meta-data get "$CONFIG_EXECUTION_KEY" --default "false" --log-level error)
  # we don't want this optimization for flaky test runs
  IS_FLAKY_TEST_RUN=$(test -z "${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}" && echo "false" || echo "true")

  if [[ "$IS_CONFIG_EXECUTION" == "true" && "$IS_FLAKY_TEST_RUN" == "false" ]]; then
    echo "--- [ already-tested ] $FULL_COMMAND"
    annotation_rows+=("| [\`${config}\`](https://github.com/elastic/kibana/blob/${BUILDKITE_COMMIT:-main}/${config}) | — | skipped (already-tested) |")
    continue
  else
    echo "--- $ $FULL_COMMAND"
  fi

  start=$(date +%s)

  if [[ "${USE_CHROME_BETA:-}" =~ ^(1|true)$ ]]; then
    echo "USE_CHROME_BETA was set - using google-chrome-beta"
    export TEST_BROWSER_BINARY_PATH="$(which google-chrome-beta)"

    # download the beta version of chromedriver
    export CHROMEDRIVER_VERSION=$(curl https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json -s | jq -r '.channels.Beta.version')
    export DETECT_CHROMEDRIVER_VERSION=false
    node node_modules/chromedriver/install.js --chromedriver-force-download

    # set annotation on the build
    buildkite-agent annotate --style info --context chrome-beta """
  ⚠️This build uses Google Chrome Beta
  Path: ${TEST_BROWSER_BINARY_PATH}
  Version: $($TEST_BROWSER_BINARY_PATH --version)
  Chromedriver version: ${CHROMEDRIVER_VERSION} / $(node node_modules/chromedriver/bin/chromedriver --version)
  """
  fi

  node scripts/ftr_check_retry_result snapshot "target/junit/$JOB" 2>/dev/null || true

  # prevent non-zero exit code from breaking the loop
  set +e;
  node ./scripts/functional_tests \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config="$config" \
    "$EXTRA_ARGS"
  lastCode=$?
  set -e;

  # Scout reporter — run under set+e so a failure here does not abort the config loop
  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    echo "Upload Scout reporter events to AppEx QA's team cluster for config $config"
    set +e
    node scripts/scout upload-events --dontFailOnError
    scout_upload_code=$?
    set -e
    if [[ $scout_upload_code -ne 0 ]]; then
      echo "Scout reporter upload exited $scout_upload_code (continuing)"
    else
      echo "Upload successful, removing local events at .scout/reports"
      rm -rf .scout/reports
    fi
  else
    echo "SCOUT_REPORTER_ENABLED=$SCOUT_REPORTER_ENABLED, skipping event upload."
  fi

  timeSec=$(($(date +%s)-start))
  if [[ $timeSec -gt 60 ]]; then
    min=$((timeSec/60))
    sec=$((timeSec-(min*60)))
    duration="${min}m ${sec}s"
  else
    duration="${timeSec}s"
  fi

  results+=("- $config
    duration: ${duration}
    result: ${lastCode}")

  config_link="[\`${config}\`](https://github.com/elastic/kibana/blob/${BUILDKITE_COMMIT:-main}/${config})"
  if [ $lastCode -eq 0 ]; then
    buildkite-agent meta-data set "$CONFIG_EXECUTION_KEY" "true"
    if [[ -n "$prevRunFailedConfigs" ]] && grep -qxF "$config" <<< "$prevRunFailedConfigs"; then
      annotation_rows+=("| ${config_link} | ${duration} | recovered |")
    else
      annotation_rows+=("| ${config_link} | ${duration} | passed |")
    fi
  else
    exitCode=10
    echo "FTR exited with code $lastCode"
    echo "^^^ +++"

    failedConfigs="${failedConfigs:+${failedConfigs}$'\n'}$config"

    if [[ -n "$prevRunFailedConfigs" ]] && grep -qxF "$config" <<< "$prevRunFailedConfigs"; then
      annotation_rows+=("| ${config_link} | ${duration} | **still failing** |")
    elif [[ -n "$prevRunFailedConfigs" ]]; then
      annotation_rows+=("| ${config_link} | ${duration} | **new failure** (was passing) |")
    else
      annotation_rows+=("| ${config_link} | ${duration} | **failed** |")
    fi

    config_failures=$(node scripts/ftr_check_retry_result list-new-failures "target/junit/$JOB" 2>/dev/null || true)
    if [[ -n "$config_failures" ]]; then
      failure_detail_lines+=("**Failing tests — \`${config}\`:**" "")
      while IFS= read -r t; do
        [[ -n "$t" ]] && failure_detail_lines+=("- ${t}")
      done <<< "$config_failures"
      failure_detail_lines+=("")
    fi
  fi
done <<< "$configs"

if [[ "$failedConfigs" ]]; then
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failedConfigs"
fi

store_failing_tests  # attempt 1: record what failed so the retry can verify recovery
apply_smart_retry    # attempt 2: mark green if all previously-failing tests explicitly passed

echo "--- FTR configs complete"
printf "%s\n" "${results[@]}"
echo ""

write_job_annotation

exit $exitCode
