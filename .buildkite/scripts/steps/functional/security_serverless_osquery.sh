#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

export JOB=kibana-osquery-cypress-serverless

echo "--- Security Osquery Serverless Cypress"

cd x-pack/platform/plugins/shared/osquery

set +e
yarn cypress:serverless:run; status=$?; yarn junit:merge || :

# Scout reporter
upload_scout_cypress_events "Cypress tests"

exit $status
