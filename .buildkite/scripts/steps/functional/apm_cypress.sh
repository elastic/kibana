#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

export JOB=kibana-apm-cypress

echo "--- APM Cypress Tests"

cd "$XPACK_DIR/solutions/observability/plugins/apm/ftr_e2e"

set +e
pnpm cypress:run; status=$?; pnpm junit:merge || :

# Scout reporter
upload_scout_cypress_events "Cypress tests"

exit $status
