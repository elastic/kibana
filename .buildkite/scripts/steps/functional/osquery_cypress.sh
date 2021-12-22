#!/usr/bin/env bash

set -uo pipefail

source .buildkite/scripts/common/util.sh

KIBANA_DIR=$(pwd)
export KIBANA_DIR
export XPACK_DIR="$KIBANA_DIR/x-pack"

export CACHE_DIR="$HOME/.kibana"

source .buildkite/scripts/common/setup_node.sh

yarn kbn bootstrap
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd x-pack

checks-reporter-with-killswitch "Osquery Cypress Tests" \
  node scripts/functional_tests \
    --debug --bail \
    --config test/osquery_cypress/cli_config.ts

ls -a plugins/osquery
ls -a plugins/osquery/cypress
