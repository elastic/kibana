#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-asset-inventory-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Asset Inventory Workflows Cypress tests"

cd x-pack/test/security_solution_cypress

set +e

yarn cypress:asset_inventory:run:ess; status=$?; yarn junit:merge || :; exit $status