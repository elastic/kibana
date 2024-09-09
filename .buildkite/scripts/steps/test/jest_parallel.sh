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
  parallelism="--runInBand"
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
  output in your test temporarily, you can modify 'packages/kbn-test/src/jest/setup/disable_console_logs.js'
"

while read -r config; do
  echo "--- $ node scripts/jest --config $config"

  # --trace-warnings to debug
  # Node.js process-warning detected:
  # Warning: Closing file descriptor 24 on garbage collection
  cmd="NODE_OPTIONS=\"--max-old-space-size=12288 --trace-warnings\" node ./scripts/jest --config=\"$config\" $parallelism --coverage=false --passWithNoTests"
  echo "actual full command is:"
  echo "$cmd"
  echo ""

  start=$(date +%s)

  # prevent non-zero exit code from breaking the loop
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

  results+=("- $config
    duration: ${duration}
    result: ${lastCode}")

  if [ $lastCode -ne 0 ]; then
    exitCode=10
    echo "Jest exited with code $lastCode"
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

echo "--- Jest configs complete"
printf "%s\n" "${results[@]}"
echo ""

exit $exitCode
