#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-defend-workflows-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Defend Workflows Cypress tests"

cd x-pack/plugins/security_solution

set +e
BK_ANALYTICS_API_KEY=$(retry 5 5 vault read -field=defend-workflows-bk-api-key secret/kibana-issues/dev/security-solution-ci)

BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn cypress:dw:run; status=$?; yarn junit:merge || :; exit $status
