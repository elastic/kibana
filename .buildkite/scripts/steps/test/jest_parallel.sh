#!/bin/bash

set -euo pipefail

source "$(dirname "$0")/../../common/util.sh"
export JOB=${BUILDKITE_PARALLEL_JOB:-0}

# a jest failure will result in the script returning an exit code of 10
exitCode=0
results=()
configs=""
failedConfigs=""

if [[ "$1" == 'jest.config.js' ]]; then
  # we used to run jest tests in parallel but started to see a lot of flakiness in libraries like react-dom/test-utils:
  # https://github.com/elastic/kibana/issues/141477
  # parallelism="-w2"
  parallelism="--maxWorkers=75%"
  TEST_TYPE="unit"
else
  # run integration tests in-band
  parallelism="--runInBand"
  TEST_TYPE="integration"
fi

export TEST_TYPE

# Added section for tracking and retrying failed configs
FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${TEST_TYPE}${JOB}"

if [[ ! "$configs" && "${BUILDKITE_RETRY_COUNT:-0}" == "1" ]]; then
  configs=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')
  if [[ "$configs" ]]; then
    echo "--- Retrying only failed configs"
    echo "$configs"
  fi
fi

if [ "$configs" == "" ]; then
  echo "--- downloading jest test run order"
  download_artifact jest_run_order.json .
  configs=$(jq -r 'getpath([env.TEST_TYPE]) | .groups[env.JOB | tonumber].names | .[]' jest_run_order.json)
fi

if [ "$configs" == "" ]; then
  echo "unable to determine configs to run"
  exit 1
fi

echo "+++ ⚠️ WARNING ⚠️"
echo "
  console.log(), console.warn(), and console.error() output in jest tests causes a massive amount
  of noise on CI without any percevable benefit, so they have been disabled. If you want to log
  output in your test temporarily, you can modify 'src/platform/packages/shared/kbn-test/src/jest/setup/disable_console_logs.js'
"

echo "--- Grouping and running configs via scripts/jest_all.js"

# Build a comma-separated list for --config
configs_csv=$(echo "$configs" | paste -sd, -)

# Build selection args differently for unit (patterns) vs integration (config files)
selection_args=()
if [[ "$TEST_TYPE" == "unit" ]]; then
  # For unit tests, groups provide glob patterns; pass them via --config CSV like integration
  selection_args=("--config=$configs_csv")
else
  # For integration tests, groups provide explicit jest config paths; pass via --config CSV
  selection_args=("--config=$configs_csv")
fi

cmd="NODE_OPTIONS=\"--max-old-space-size=12288 --trace-warnings --no-experimental-require-module"
if [ "${KBN_ENABLE_FIPS:-}" == "true" ]; then
  cmd=$cmd" --enable-fips --openssl-config=$HOME/nodejs.cnf"
fi

if [[ "$TEST_TYPE" == "unit" ]]; then
  cmd=$cmd"\" node ./scripts/jest_all ${selection_args[*]} $parallelism --coverage=false --passWithNoTests"
else
  cmd=$cmd"\" node ./scripts/jest ${selection_args[*]} $parallelism --coverage=false --passWithNoTests"
fi

echo "actual full command is:"
echo "$cmd"
echo ""

start=$(date +%s)
set +e;
eval "$cmd"
lastCode=$?
set -e;

timeSec=$(($(date +%s)-start))
if [[ $timeSec -gt 60 ]]; then
  min=$((timeSec/60))
  sec=$((timeSec-(min*60)))
  duration="${min}m ${sec}s"
else
  duration="${timeSec}s"
fi

results+=("- grouped-configs
    duration: ${duration}
    result: ${lastCode}")

if [ $lastCode -ne 0 ]; then
  exitCode=10
  echo "Jest exited with code $lastCode"
  echo "^^^ +++"
  # On failure, mark all configs as failed so retry mechanism can pick them up
  failedConfigs="$configs"
fi

if [[ "$failedConfigs" ]]; then
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failedConfigs"
fi

echo "--- Jest configs complete"
printf "%s\n" "${results[@]}"
echo ""

# Scout reporter
echo "--- Upload Scout reporter events to AppEx QA's team cluster"
if [[ "${SCOUT_REPORTER_ENABLED:-}" == "true" ]]; then
  node scripts/scout upload-events --dontFailOnError
else
  echo "⚠️ The SCOUT_REPORTER_ENABLED environment variable is not 'true'. Skipping event upload."
fi

exit $exitCode
