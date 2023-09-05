#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

.buildkite/scripts/bootstrap.sh
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd x-pack/plugins/osquery

set +e
yarn cypress:run; status=$?; yarn junit:merge && exit $status
