#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-serverless-security-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Security Serverless Cypress Tests"

cd x-pack/test/security_solution_cypress

set +e
yarn cypress:run:serverless; status=$?; yarn junit:merge || :; exit $status
