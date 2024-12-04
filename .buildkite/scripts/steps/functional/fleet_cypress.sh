#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-fleet-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Fleet Cypress tests (Chrome)"

cd x-pack/plugins/fleet

set +e
yarn cypress:run:reporter; status=$?; yarn cypress_space_awareness:run:reporter; space_status=$?; yarn junit:merge || :; [ "$status" -ne 0 ] && exit $status || [ "$space_status" -ne 0 ] && exit $space_status || exit 0
