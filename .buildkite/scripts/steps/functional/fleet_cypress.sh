#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-fleet-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Fleet Cypress tests (Chrome)"

cd x-pack/plugins/fleet

set +e
yarn cypress:run:reporter; status=$?; yarn junit:merge || :; exit $status
