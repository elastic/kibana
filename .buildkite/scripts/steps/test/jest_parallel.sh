#!/bin/bash

set -uo pipefail

export CODE_COVERAGE=true
export COVERALLS_PARALLEL=true

yarn add coveralls # TODO move

JOB=$BUILDKITE_PARALLEL_JOB
JOB_COUNT=$BUILDKITE_PARALLEL_JOB_COUNT

# a jest failure will result in the script returning an exit code of 10

i=0
exitCode=0

# target/jest-coverage/lcov.info

while read -r config; do
  if [ "$((i % JOB_COUNT))" -eq "$JOB" ]; then
    echo "--- $ node scripts/jest --config $config"
    rm -f target/jest-coverage/lcov.info
    node --max-old-space-size=14336 ./node_modules/.bin/jest --config="$config" --runInBand --coverage=false --passWithNoTests \
      --coverage --coverageReporters lcov --coverageDirectory target/jest-coverage
    lastCode=$?

    if [ $lastCode -ne 0 ]; then
      exitCode=10
      echo "Jest exited with code $lastCode"
      echo "^^^ +++"
    fi
  fi

  echo 'Uploading to coveralls...'
  cat target/jest-coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js
  buildkite-agent meta-data set "did-upload-coveralls" 'true'
  

  ((i=i+1))
# uses heredoc to avoid the while loop being in a sub-shell thus unable to overwrite exitCode
done <<< "$(find src x-pack packages -name ${1:-jest.config.js} -not -path "*/__fixtures__/*" | sort)"

exit $exitCode
