#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Workflow Step Schema Code Generation"

SCHEMA_CONFIG="src/platform/packages/private/kbn-workflow-step-schema-cli/integration_tests/jest.integration.config.js"
node scripts/jest_integration --config "$SCHEMA_CONFIG"

check_for_changed_files "node scripts/jest_integration --config $SCHEMA_CONFIG" true
