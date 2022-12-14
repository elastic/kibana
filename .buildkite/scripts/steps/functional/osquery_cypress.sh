#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

node scripts/functional_tests \
  --debug --bail \
  --config x-pack/test/osquery_cypress/cli_config.ts

