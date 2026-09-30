#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Response Ops Cypress Tests on Security Solution"

cd x-pack/solutions/security/test/security_solution_cypress

set +e
pnpm cypress:run:respops:ess; status=$?; pnpm junit:merge || :

# Scout reporter
upload_scout_cypress_events "Cypress tests"

exit $status
