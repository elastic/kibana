#!/bin/bash

set -uo pipefail

export COVERALLS_PARALLEL=true

JOB=$BUILDKITE_PARALLEL_JOB
JOB_COUNT=$BUILDKITE_PARALLEL_JOB_COUNT

# a jest failure will result in the script returning an exit code of 10

i=0
exitCode=0

while read -r config; do
  if [ "$((i % JOB_COUNT))" -eq "$JOB" ]; then
    if [[ "$config" == *"jest.config.js" ]]; then
      export CODE_COVERAGE=true
    else
      export CODE_COVERAGE=''
    fi

    echo "--- $ node scripts/jest --config $config"
    rm -f target/jest-coverage/lcov.info

    if [[ "$CODE_COVERAGE" == "true" ]]; then
      node --max-old-space-size=14336 ./scripts/jest --config="$config" --runInBand --coverage=false --passWithNoTests \
        --coverage --coverageReporters json --coverageDirectory target/jest-coverage
    else
      node --max-old-space-size=14336 ./scripts/jest --config="$config" --runInBand --coverage=false --passWithNoTests
    fi
    lastCode=$?

    if [ $lastCode -ne 0 ]; then
      exitCode=10
      echo "Jest exited with code $lastCode"
      echo "^^^ +++"
    else
      if [[ "$CODE_COVERAGE" == "true" ]]; then
        mv target/jest-coverage/coverage-final.json "target/jest-coverage/$(cat /proc/sys/kernel/random/uuid).json"
      fi
    fi
  fi

  ((i=i+1))
# uses heredoc to avoid the while loop being in a sub-shell thus unable to overwrite exitCode
done <<< "$(find src x-pack packages -name "$1" -not -path "*/__fixtures__/*" | sort)"

# Combine the reports into one file before uploading anything to coveralls
# This is just to reduce the number of "jobs" on the coveralls page, as each invocation adds a build
if [[ -d target/jest-coverage ]]; then
  mv target/jest-coverage .nyc_output
  yarn nyc report --reporter=lcov --report-dir=target/jest-coverage-merged
  cat target/jest-coverage-merged/lcov.info | ./node_modules/coveralls/bin/coveralls.js
  buildkite-agent meta-data set "did-upload-coveralls" 'true'
fi


exit $exitCode
