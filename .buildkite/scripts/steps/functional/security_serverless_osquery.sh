#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

# TODO: remove the line below to use build artifacts for tests.
# in addition to remove the line, we will have to expose the kibana install dir into the downloaded build location
# by exporting a var like:
# export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-osquery-cypress-serverless

echo "--- Security Osquery Serverless Cypress"

cd x-pack/plugins/osquery

set +e
yarn cypress:serverless:run; status=$?; yarn junit:merge || :; exit $status
