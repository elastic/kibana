#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-asset-inventory-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Asset Inventory Workflows Cypress tests"

cd x-pack/solutions/security/test/security_solution_cypress

set +e

pnpm cypress:asset_inventory:run:ess; status=$?; pnpm junit:merge || :

# Scout reporter
upload_scout_cypress_events "Cypress tests"

exit $status
