#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-apm-synthetics

echo "--- APM @elastic/synthetics Tests"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "APM @elastic/synthetics Tests" \
  node plugins/apm/scripts/test/synthetics.js \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION"
