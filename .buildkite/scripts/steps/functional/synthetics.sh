#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-uptime-playwright

echo "--- synthetics @elastic/synthetics Tests"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "synthetics @elastic/synthetics Tests" \
  node plugins/synthetics/scripts/e2e.js --kibana-install-dir "$KIBANA_BUILD_LOCATION" --grep "MonitorManagement-monitor*"
