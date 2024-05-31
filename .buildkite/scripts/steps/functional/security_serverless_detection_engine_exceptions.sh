#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Detection Engine - Exceptions - Cypress Tests on Serverless"

cd x-pack/test/security_solution_cypress

set +e
BK_ANALYTICS_API_KEY=$(vault_get security-solution-ci sec-sol-cypress-bk-api-key)

BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn cypress:detection_engine:exceptions:run:serverless; status=$?; yarn junit:merge || :; exit $status
