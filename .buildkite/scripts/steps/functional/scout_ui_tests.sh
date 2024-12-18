#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-scout-ui-tests

TEST_CONFIG="x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts"
KIBANA_DIR="$KIBANA_BUILD_LOCATION"

echo "--- Stateful: 'discover_enhanced' plugin UI Tests"
node scripts/scout run-tests --stateful --config "$TEST_CONFIG" --kibana-install-dir "$KIBANA_DIR"
