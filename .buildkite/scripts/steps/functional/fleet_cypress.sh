#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-fleet-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Fleet Cypress tests (Chrome)"

cd x-pack/platform/plugins/shared/fleet

set +e
yarn cypress:ci:run; status=$?; yarn cypress_space_awareness:ci:run; space_status=$?; yarn junit:merge || :

# Scout reporter
upload_scout_cypress_events "Fleet Cypress tests"

# Exit with appropriate status
if [ "$status" -ne 0 ]; then
  exit $status
elif [ "$space_status" -ne 0 ]; then
  exit $space_status
fi
