#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-defend-workflows-endpoint-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}


echo "--- Defend Workflows Endpoint Cypress tests"

yarn --cwd x-pack/plugins/security_solution cypress:dw:endpoint:run
