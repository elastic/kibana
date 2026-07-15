#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/test/ftr_smart_retry.sh

BUILDKITE_PARALLEL_JOB=${BUILDKITE_PARALLEL_JOB:-}
FTR_CONFIG_GROUP_KEY=${FTR_CONFIG_GROUP_KEY:-}
if [ "$FTR_CONFIG_GROUP_KEY" == "" ] && [ "$BUILDKITE_PARALLEL_JOB" == "" ]; then
  echo "Missing FTR_CONFIG_GROUP_KEY env var"
  exit 1
fi

BAIL_ARG="--bail"
if [[ "${FTR_SMART_RETRY_ENABLED:-}" =~ ^(1|true)$ ]]; then
  BAIL_ARG=""
fi

# Enable consecutive-failure fail-fast only when --bail is disabled (i.e. smart retry
# runs the whole suite) and this isn't a flaky-test run. Respect an explicitly pre-set value.
if [[ -z "${FTR_FAIL_FAST_ENABLED:-}" ]]; then
  if [[ -z "$BAIL_ARG" && -z "${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}" ]]; then
    FTR_FAIL_FAST_ENABLED=true
  else
    FTR_FAIL_FAST_ENABLED=false
  fi
fi
export FTR_FAIL_FAST_ENABLED

EXTRA_ARGS=${FTR_EXTRA_ARGS:-}
test -z "$EXTRA_ARGS" || buildkite-agent meta-data set "ftr-extra-args" "$EXTRA_ARGS"

export JOB="$FTR_CONFIG_GROUP_KEY"

FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${FTR_CONFIG_GROUP_KEY}"

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
failFastFired=false

while read -r config; do
  if [[ ! "$config" ]]; then
    continue;
  fi

  FULL_COMMAND="node scripts/functional_tests $BAIL_ARG --config $config $EXTRA_ARGS"

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
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config="$config" \
    $BAIL_ARG \
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
    echo "FTR exited with code $lastCode"
    echo "^^^ +++"

    if [[ "$failedConfigs" ]]; then
      failedConfigs="${failedConfigs}"$'\n'"$config"
    else
      failedConfigs="$config"
    fi

    if [ $lastCode -eq 91 ]; then
      # fail-fast: too many consecutive failures, most likely an environmental problem.
      # Stop running the remaining configs and let CI retry the step once (see steps.ts).
      exitCode=11
      failFastFired=true

      # Record the not-yet-run configs alongside the failing one so the retry attempt,
      # which only reruns configs stored in FAILED_CONFIGS_KEY, still covers them.
      remainingConfigs=$(awk -v c="$config" 'found { print } $0 == c { found = 1 }' <<< "$configs")
      if [[ "$remainingConfigs" ]]; then
        failedConfigs="${failedConfigs}"$'\n'"$remainingConfigs"
      fi

      buildkite-agent annotate --style error --context ftr-fail-fast \
        "FTR aborted '$config' early after too many consecutive failures (likely an environmental issue). Remaining configs were skipped; the step will be retried once."
      break
    else
      exitCode=10
    fi
  fi
done <<< "$configs"

if [[ "$failedConfigs" ]]; then
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failedConfigs"
fi

if [[ "$failFastFired" == "false" ]] && smart_retry_applicable; then
  retryCount=${BUILDKITE_RETRY_COUNT:-0}

  if [[ "$retryCount" == "0" ]]; then
    store_failing_tests
  fi

  if [[ "$retryCount" == "1" ]]; then
    apply_smart_retry
  fi
fi

echo "--- FTR configs complete"
printf "%s\n" "${results[@]}"
echo ""

exit $exitCode
