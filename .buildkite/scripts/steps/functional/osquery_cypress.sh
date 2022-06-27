#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export BUILD_TS_REFS_DISABLE=false
.buildkite/scripts/bootstrap.sh
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

checks-reporter-with-killswitch "Osquery Cypress Tests" \
 node scripts/functional_tests \
   --debug --bail \
   --config x-pack/test/osquery_cypress/cli_config.ts

