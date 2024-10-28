#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh
.buildkite/scripts/copy_es_snapshot_cache.sh

export JOB=kibana-inventory-onboarding-cypress

echo "--- Observability Inventory Cypress Tests"

cd "$XPACK_DIR"

node plugins/observability_solution/inventory/scripts/test/e2e.js \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \