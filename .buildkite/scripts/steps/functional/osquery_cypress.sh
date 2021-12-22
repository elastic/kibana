#!/usr/bin/env bash

set -uo pipefail

source .buildkite/scripts/common/util.sh

export BUILD_TS_REFS_DISABLE=false
export BUILD_TS_REFS_CACHE_ENABLE=false
export DEBUG=code-coverage
yarn kbn bootstrap
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Osquery Cypress Tests" \
  node scripts/functional_tests \
    --debug --bail \
    --config test/osquery_cypress/cli_config.ts

ls -a plugins/osquery
ls -a plugins/osquery/cypress
