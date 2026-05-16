#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

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

# a FTR failure will result in the script returning an exit code of 10
exitCode=0

configs="${FTR_CONFIG:-}"

# The first retry should only run the configs that failed in the previous attempt
# Any subsequent retries, which would generally only happen by someone clicking the button in the UI, will run everything
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

while read -r config; do
  if [[ ! "$config" ]]; then
    continue;
  fi

  FULL_COMMAND="node scripts/functional_tests --bail --config $config $EXTRA_ARGS"

  # see if this config has already been executed successfully
  CONFIG_EXECUTION_KEY="${config}_executed"
  IS_CONFIG_EXECUTION=$(buildkite-agent meta-data get "$CONFIG_EXECUTION_KEY" --default "false" --log-level error)
  # we don't want this optimization for flaky test runs
  IS_FLAKY_TEST_RUN=$(test -z "${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}" && echo "false" || echo "true")

  if [[ "$IS_CONFIG_EXECUTION" == "true" && "$IS_FLAKY_TEST_RUN" == "false" ]]; then
    echo "--- [ already-tested ] $FULL_COMMAND"
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

  # prevent non-zero exit code from breaking the loop
  set +e;
  node ./scripts/functional_tests \
    --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config="$config" \
    "$EXTRA_ARGS"
  lastCode=$?
  set -e;

  # Scout reporter
  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    # Upload events after running each config
    echo "Upload Scout reporter events to AppEx QA's team cluster for config $config"
    node scripts/scout upload-events --dontFailOnError
    echo "Upload successful, removing local events at .scout/reports"
    rm -rf .scout/reports
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

  if [ $lastCode -eq 0 ]; then
    # Test was successful, so mark it as executed
    buildkite-agent meta-data set "$CONFIG_EXECUTION_KEY" "true"
  else
    exitCode=10
    echo "FTR exited with code $lastCode"
    echo "^^^ +++"

    if [[ "$failedConfigs" ]]; then
      failedConfigs="${failedConfigs}"$'\n'"$config"
    else
      failedConfigs="$config"
    fi
  fi
done <<< "$configs"

if [[ "$failedConfigs" ]]; then
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failedConfigs"
fi

# --- retry-only-failed feature ---
# Attempt 1: record the names of failing tests so the retry can evaluate whether they recovered.
# On the first retry, the step is marked green if every previously-failing test passes — even if
# a different (previously-passing) test happens to fail on retry.
if [[ -z "${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}" && \
      "${BUILDKITE_RETRY_COUNT:-0}" == "0" && "$exitCode" != "0" ]]; then
  junitDir="target/junit/$JOB"
  if [ -d "$junitDir" ]; then
    failedTestNames=$(node scripts/ftr_check_retry_result list-failures "$junitDir" 2>/dev/null || true)
    if [[ "$failedTestNames" ]]; then
      buildkite-agent meta-data set "$FAILED_TESTS_KEY" "$failedTestNames"
      echo "Stored $(echo "$failedTestNames" | wc -l | tr -d ' ') previously-failing test name(s) for retry evaluation"
    fi
  fi
fi

# Attempt 2: check whether the failures from attempt 1 are still failing.
# If every previously-failing test now passes, mark the step green.
if [[ -z "${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}" && \
      "${BUILDKITE_RETRY_COUNT:-0}" == "1" && "$exitCode" != "0" ]]; then
  prevFailedTests=$(buildkite-agent meta-data get "$FAILED_TESTS_KEY" --default '' 2>/dev/null || true)
  if [[ "$prevFailedTests" ]]; then
    junitDir="target/junit/$JOB"
    tmpPrevFile=$(mktemp)
    printf '%s' "$prevFailedTests" > "$tmpPrevFile"
    set +e
    node scripts/ftr_check_retry_result check-intersection \
      --junit-dir "$junitDir" \
      --prev-failures-file "$tmpPrevFile"
    intersectionCode=$?
    set -e
    rm -f "$tmpPrevFile"
    if [[ "$intersectionCode" == "0" ]]; then
      echo "--- [retry-only-failed] All previously-failing tests recovered on retry — marking step green"
      exitCode=0
      failedConfigs=""
      buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "" 2>/dev/null || true
    fi
  fi
fi
# --- end retry-only-failed feature ---

echo "--- FTR configs complete"
printf "%s\n" "${results[@]}"
echo ""

exit $exitCode
