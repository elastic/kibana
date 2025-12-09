#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-fleet-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Fleet Cypress tests (Chrome)"

cd x-pack/platform/plugins/shared/fleet

set +e
yarn cypress:run:reporter; status=$?; yarn cypress_space_awareness:run:reporter; space_status=$?; yarn junit:merge || :

# Determine final status
if [ "$status" -ne 0 ]; then
  final_status=$status
elif [ "$space_status" -ne 0 ]; then
  final_status=$space_status
else
  final_status=0
fi

# Scout reporter
upload_scout_cypress_events "Fleet Cypress tests"

exit $final_status
