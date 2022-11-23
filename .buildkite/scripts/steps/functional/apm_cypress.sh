#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

APM_CYPRESS_RECORD_KEY="$(retry 5 5 vault read -field=CYPRESS_RECORD_KEY secret/kibana-issues/dev/apm-cypress-dashboard-record-key)"

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-apm-cypress

echo "--- APM Cypress Tests"

cd "$XPACK_DIR"

node plugins/apm/scripts/test/e2e.js \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --record \
  --key "$APM_CYPRESS_RECORD_KEY"
