#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-defend-workflows-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

# echo "--- Defend Workflows Cypress tests"
echo "--- Defend Workflows Cypress tests DROPPED"

# cd x-pack/plugins/security_solution
#
# set +e
# BK_ANALYTICS_API_KEY=$(vault_get security-solution-ci defend-workflows-bk-api-key)
