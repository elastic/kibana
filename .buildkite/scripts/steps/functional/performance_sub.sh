#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

cd "$XPACK_DIR"

echo --- Run Performance Tests

if [ -z "${TEST_RUNNER+x}" ]; then
  CONFIG_FILE="test/performance/config.ftr.ts"
elif [ "$TEST_RUNNER" = "FTR" ]; then
  CONFIG_FILE="test/performance/config.ftr.ts"
elif [ "$TEST_RUNNER" = "SYNTHETICS" ]; then
  CONFIG_FILE="test/performance/config.synthetics.ts"
fi

checks-reporter-with-killswitch "Run Performance Tests" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config "$CONFIG_FILE";
