#!/bin/bash

set -uo pipefail

source .buildkite/scripts/steps/test/jest_env.sh

export JOB=$BUILDKITE_PARALLEL_JOB

# a jest failure will result in the script returning an exit code of 10
exitCode=0

if [[ "$1" == 'jest.config.js' ]]; then
  # run unit tests in parallel
  parallelism="-w2"
  TEST_TYPE="unit"
else
  # run integration tests in-band
  parallelism="--runInBand"
  TEST_TYPE="integration"
fi

export TEST_TYPE
echo "--- downloading integration test run order"
buildkite-agent artifact download jest_run_order.json .
configs=$(jq -r 'getpath([env.TEST_TYPE]) | .groups[env.JOB | tonumber].names | .[]' jest_run_order.json)

while read -r config; do
  echo "--- $ node scripts/jest --config $config"
  NODE_OPTIONS="--max-old-space-size=14336" node ./scripts/jest --config="$config" "$parallelism" --coverage=false --passWithNoTests
  lastCode=$?

  if [ $lastCode -ne 0 ]; then
    exitCode=10
    echo "Jest exited with code $lastCode"
    echo "^^^ +++"
  fi
done <<< "$configs"

exit $exitCode
