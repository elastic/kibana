#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export NODE_OPTIONS=--max_old_space_size=8192
export CODE_COVERAGE=1

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana_plugins.sh

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Osquery Cypress Tests" \
  node scripts/functional_tests \
    --debug --bail \
    --config test/osquery_cypress/cli_config.ts

echo "--- Deleting videos after sourcesful tests"
rm -rf ../target/kibana-osquery/videos

echo "--- Upload coverage"
tar -zcf ../target/kibana-osquery/coverage.tar.gz ./x-pack/plugins/osquery/coverage
