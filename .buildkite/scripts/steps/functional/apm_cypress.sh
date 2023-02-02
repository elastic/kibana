#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

APM_CYPRESS_RECORD_KEY="$(retry 5 5 vault read -field=CYPRESS_RECORD_KEY secret/kibana-issues/dev/apm-cypress-dashboard-record-key)"

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-apm-cypress
IS_FLAKY_TEST_RUNNER=${CLI_COUNT:-0}

# Disable parallel tests and dashboard recording when running them in the flaky test runner
if [[ "$IS_FLAKY_TEST_RUNNER" -ne 1 ]]; then
  CYPRESS_ARGS="--record --key "$APM_CYPRESS_RECORD_KEY" --parallel --ci-build-id "${BUILDKITE_BUILD_ID}""
else
  CYPRESS_ARGS=""
fi

echo "--- APM Cypress Tests"

cd "$XPACK_DIR"

node plugins/apm/scripts/test/e2e.js \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  $CYPRESS_ARGS
