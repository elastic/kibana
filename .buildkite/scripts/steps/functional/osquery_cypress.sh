#!/usr/bin/env bash

set -uo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

export CODE_COVERAGE=1

checks-reporter-with-killswitch "Osquery Cypress Tests" \
   yarn --cwd x-pack/plugins/osquery cypress:run-as-ci

buildkite-agent artifact upload 'target/kibana-osquery/**/*'
