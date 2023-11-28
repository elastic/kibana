#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Rule Management - Prebuilt Rules - Security Solution Cypress Tests"

cd x-pack/test/security_solution_cypress

set +e
yarn cypress:rule_management:prebuilt_rules:run:ess; status=$?; yarn junit:merge || :; exit $status
