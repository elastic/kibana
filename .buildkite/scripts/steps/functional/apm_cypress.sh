#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-apm-cypress
export CLI_NUMBER=$((BUILDKITE_PARALLEL_JOB+1))
export CLI_COUNT=$BUILDKITE_PARALLEL_JOB_COUNT

echo "--- APM Cypress Tests"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "APM Cypress Tests $CLI_NUMBER" \
  node plugins/apm/scripts/test/e2e.js \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION"
