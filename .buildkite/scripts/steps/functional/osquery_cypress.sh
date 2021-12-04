#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Osquery Cypress Tests" \
 node scripts/functional_tests \
   --debug --bail \
   --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
   --config test/osquery_cypress/cli_config.ts
