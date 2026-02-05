#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-defend-workflows-serverless-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Defend Workflows Cypress tests on Serverless"

cd x-pack/solutions/security/plugins/security_solution

set +e
BK_ANALYTICS_API_KEY=$(vault_get security-solution-ci defend-workflows-bk-api-key)

BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn cypress:dw:serverless:run; status=$?; yarn junit:merge || :

# Scout reporter
upload_scout_cypress_events "Cypress tests"

exit $status
