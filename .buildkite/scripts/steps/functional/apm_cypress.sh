#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

APM_CYPRESS_RECORD_KEY="$(retry 5 5 vault read -field=CYPRESS_RECORD_KEY secret/kibana-issues/dev/apm-cypress-dashboard-record-key)"

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-apm-cypress
CLI_NUMBER=$((BUILDKITE_PARALLEL_JOB+1))

# Disable parallel tests and dashboard recording when running them in the flaky test runner
if [[ "$CLI_COUNT" -ne 1 ]]; then
  CYPRESS_DASHBOARD_ARGS="--record --key "$APM_CYPRESS_RECORD_KEY""
  CYPRESS_PARALLELIZATION_ARGS="--parallel --ci-build-id "${BUILDKITE_BUILD_ID}""
fi

echo "--- APM Cypress Tests"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "APM Cypress Tests $CLI_NUMBER" \
  node plugins/apm/scripts/test/e2e.js \
  $CYPRESS_DASHBOARD_ARGS \
  $CYPRESS_PARALLELIZATION_ARGS
