#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

cd "$XPACK_DIR"

echo --- Run Performance Tests with Synthetics config

checks-reporter-with-killswitch "Run Performance Tests with Synthetics Config" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config "test/performance/synthetics.ftr.ts";
