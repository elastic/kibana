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
    echo "--- $ node scripts/jest --config $config"
    rm -f target/kibana-coverage/jest/coverage-final.json
    node --max-old-space-size=14336 ./node_modules/.bin/jest --config="$config" --runInBand --coverageReporters json
    lastCode=$?

    if [ $lastCode -ne 0 ]; then
      exitCode=10
      echo "Jest exited with code $lastCode"
      echo "^^^ +++"
    fi

    echo "Uploading to codecov"
    # codecov exits with an error if max-old-space-size is set, see https://github.com/codecov/uploader/issues/475
    NODE_OPTIONS="" ./codecov -d -v -f target/kibana-coverage/jest/coverage-final.json # TODO move ./codecov
  fi

  ((i=i+1))
# uses heredoc to avoid the while loop being in a sub-shell thus unable to overwrite exitCode
done <<< "$(find src x-pack packages -name jest.config.js -not -path "*/__fixtures__/*" | sort)"

exit $exitCode
