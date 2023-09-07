#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Response Ops Cases Cypress Tests on Security Solution"

cd x-pack/test/security_solution_cypress

set +e
yarn cypress:run:cases:ess; status=$?; yarn junit:merge || :; exit $status
