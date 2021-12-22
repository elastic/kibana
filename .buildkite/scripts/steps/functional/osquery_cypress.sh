#!/usr/bin/env bash

set -uo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd "$KIBANA_DIR"

checks-reporter-with-killswitch "Osquery Cypress Tests" \
   yarn --cwd x-pack/plugins/osquery cypress:run-as-ci

buildkite-agent artifact upload 'target/kibana-osquery/**/*'
