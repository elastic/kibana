#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd x-pack/platform/plugins/shared/osquery

set +e
pnpm cypress:run; status=$?; pnpm junit:merge || :

# Scout reporter
upload_scout_cypress_events "Cypress tests"

exit $status
