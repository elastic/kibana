#!/bin/bash

set -uo pipefail

export CODE_COVERAGE=true

# TODO move this to agent set up
curl https://keybase.io/codecovsecurity/pgp_keys.asc | gpg --no-default-keyring --keyring trustedkeys.gpg --import
curl -Os https://uploader.codecov.io/latest/linux/codecov
curl -Os https://uploader.codecov.io/latest/linux/codecov.SHA256SUM
curl -Os https://uploader.codecov.io/latest/linux/codecov.SHA256SUM.sig
gpgv codecov.SHA256SUM.sig codecov.SHA256SUM
shasum -a 256 -c codecov.SHA256SUM
chmod +x codecov

JOB=$BUILDKITE_PARALLEL_JOB
JOB_COUNT=$BUILDKITE_PARALLEL_JOB_COUNT

# a jest failure will result in the script returning an exit code of 10

i=0
exitCode=0

while read -r config; do
  if [ "$((i % JOB_COUNT))" -eq "$JOB" ]; then
    # Coverage for unit tests only, skip for jest integration tests
    if [[ "$config" == *"jest.config.js" ]]; then
      export CODE_COVERAGE=true
    else
      export CODE_COVERAGE=''
    fi

    if [[ "$CODE_COVERAGE" == "true" ]]; then
      node --max-old-space-size=14336 ./scripts/jest --config="$config" --runInBand \
        --passWithNoTests --coverageReporters json --coverageDirectory target/jest-coverage --coverage
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

# Combine the reports into one file before uploading anything to codecov
if [[ -d target/jest-coverage ]]; then
  mv target/jest-coverage .nyc_output
  yarn nyc report --reporter=json --report-dir=target/jest-coverage-merged

  echo "Uploading to codecov"
  node .buildkite/scripts/steps/test/clean_coverage_paths.js target/jest-coverage-merged/coverage-final.json
  # codecov exits with an error if max-old-space-size is set, see https://github.com/codecov/uploader/issues/475
  NODE_OPTIONS="" ./codecov -f target/jest-coverage-merged/coverage-final.json # TODO move ./codecov
  buildkite-agent meta-data set "did-upload-codecov" 'true'
fi


exit $exitCode
