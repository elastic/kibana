#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-synthetics-plugin

echo "--- Synthetics plugin @elastic/synthetics Tests"

cd "$XPACK_DIR"

node plugins/observability_solution/synthetics/scripts/e2e.js --kibana-install-dir "$KIBANA_BUILD_LOCATION" ${GREP:+--grep \"${GREP}\"}
