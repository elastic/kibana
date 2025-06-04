#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-asset-inventory-serverless-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Asset Inventory Workflows Cypress tests on Serverless"

cd x-pack/test/security_solution_cypress

set +e

yarn cypress:asset_inventory:run:serverless; status=$?; yarn junit:merge || :; exit $status