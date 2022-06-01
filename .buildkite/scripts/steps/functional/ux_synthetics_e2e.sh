#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-ux-plugin-synthetics

echo "--- User Experience @elastic/synthetics Tests"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "User Experience plugin @elastic/synthetics Tests" \
  node plugins/ux/scripts/e2e.js --kibana-install-dir "$KIBANA_BUILD_LOCATION" ${GREP:+--grep \"${GREP}\"}
