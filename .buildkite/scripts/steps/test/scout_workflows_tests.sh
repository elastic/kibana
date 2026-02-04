#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Running Scout Workflows Management Tests'
node scripts/scout.js run-tests --stateful --config src/platform/plugins/shared/workflows_management/test/scout_workflows_ui/ui/parallel.playwright.config.ts --kibana-install-dir "$KIBANA_BUILD_LOCATION"

source .buildkite/scripts/steps/test/scout_upload_report_events.sh
