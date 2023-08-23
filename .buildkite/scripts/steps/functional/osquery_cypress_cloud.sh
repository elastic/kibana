#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

.buildkite/scripts/bootstrap.sh
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-osquery-cypress-cloud

echo "--- Osquery Cypress tests"

yarn --cwd x-pack/plugins/osquery cypress:run:cloud
