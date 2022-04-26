#!/bin/bash

set -uo pipefail

JOB=$BUILDKITE_PARALLEL_JOB
JOB_COUNT=$BUILDKITE_PARALLEL_JOB_COUNT

# a jest failure will result in the script returning an exit code of 10

i=0
exitCode=0

# run unit tests in parallel
if [[ "$1" == 'jest.config.js' ]]; then
  parallelism="-w2"
else
  parallelism="--runInBand"
fi

while read -r config; do
  if [ "$((i % JOB_COUNT))" -eq "$JOB" ]; then
    echo "--- $ node scripts/jest --config $config"
    node --max-old-space-size=14336 ./scripts/jest --config="$config" "$parallelism" --coverage=false --passWithNoTests
    lastCode=$?

    if [ $lastCode -ne 0 ]; then
      exitCode=10
      echo "Jest exited with code $lastCode"
      echo "^^^ +++"
    fi
  fi

  ((i=i+1))
# uses heredoc to avoid the while loop being in a sub-shell thus unable to overwrite exitCode
done <<< "$(find src x-pack packages -name "$1" -not -path "*/__fixtures__/*" | sort)"

exit $exitCode
