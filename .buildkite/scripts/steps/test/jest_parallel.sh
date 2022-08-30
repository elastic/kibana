#!/bin/bash

set -euo pipefail

source "$(dirname "$0")/../../common/util.sh"
export JOB=${BUILDKITE_PARALLEL_JOB:-0}

# a jest failure will result in the script returning an exit code of 10
exitCode=0
results=()

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
configs="x-pack/plugins/index_lifecycle_management/jest.config.js
x-pack/plugins/index_lifecycle_management/jest.config.js
x-pack/plugins/index_lifecycle_management/jest.config.js
x-pack/plugins/index_lifecycle_management/jest.config.js
x-pack/plugins/index_lifecycle_management/jest.config.js
x-pack/plugins/index_lifecycle_management/jest.config.js
x-pack/plugins/index_lifecycle_management/jest.config.js
x-pack/plugins/index_lifecycle_management/jest.config.js
x-pack/plugins/index_lifecycle_management/jest.config.js
x-pack/plugins/index_lifecycle_management/jest.config.js"

while read -r config; do
  echo "--- $ node scripts/jest --config $config"
  start=$(date +%s)

  # prevent non-zero exit code from breaking the loop
  set +e;
  NODE_OPTIONS="--max-old-space-size=14336" node ./scripts/jest --config="$config" "$parallelism" --coverage=false --passWithNoTests
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
    exit $exitCode
  fi
done <<< "$configs"

echo "--- Jest configs complete"
printf "%s\n" "${results[@]}"
echo ""

exit $exitCode
