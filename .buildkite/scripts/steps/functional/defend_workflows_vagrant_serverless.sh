#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-defend-workflows-endpoint-serverless-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Defend Workflows Endpoint Cypress tests on Serverless"

cd x-pack/plugins/security_solution

yarn cypress:dw:endpoint:serverless:run; status=$?; yarn junit:merge || :; exit $status
