#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-scout-ui-tests

node scripts/scout_test \
  --stateful \
  --config x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION"