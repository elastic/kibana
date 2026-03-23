#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Detection Engine - Exceptions - Security Solution Cypress Tests"

cd x-pack/solutions/security/test/security_solution_cypress

set +e
BK_ANALYTICS_API_KEY=$(vault_get security-solution-ci sec-sol-cypress-bk-api-key)

BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn cypress:detection_engine:exceptions:run:ess; status=$?; yarn junit:merge || :

# Scout reporter
upload_scout_cypress_events "Cypress tests"

exit $status
