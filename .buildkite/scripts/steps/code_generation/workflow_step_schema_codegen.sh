#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Workflow Step Schema Code Generation"

SCHEMA_CONFIG="src/platform/packages/private/kbn-workflow-step-schema-cli/integration_tests/jest.integration.config.js"

run_check() {
  node scripts/jest_integration --config "$SCHEMA_CONFIG"
}

# Booting ES + Kibana is the flakiest part of this check; mirror
# capture_oas_snapshot.sh and retry before failing the lane.
retry 5 15 run_check

check_for_changed_files "node scripts/jest_integration --config $SCHEMA_CONFIG" true
