#!/bin/bash

set -uo pipefail

JOB=$BUILDKITE_PARALLEL_JOB
JOB_COUNT=$BUILDKITE_PARALLEL_JOB_COUNT

# a jest failure will result in the script returning an exit
# code of 10

i=0
exitCode=0

find src x-pack packages -name jest.config.js -not -path "*/__fixtures__/*" | sort | while read config; do
  if [ "$(($i % $JOB_COUNT))" -eq $JOB ]; then
    echo "--- $ node scripts/jest --config $config"
    node --max-old-space-size=8192 --expose-gc ./node_modules/.bin/jest --config $config --runInBand --logHeapUsage

    if [ $? -ne 0 ]; then
      exitCode=10
      echo "^^^ +++"
    fi
  fi

  ((i=i+1))
done

exit $exitCode