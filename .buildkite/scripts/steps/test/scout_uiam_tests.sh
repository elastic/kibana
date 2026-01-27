#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Running Scout UIAM Integration Tests'
node scripts/scout.js run-tests --serverless security --config x-pack/platform/plugins/shared/security/test/scout_uiam_local/api/parallel.playwright.config.ts --kibana-install-dir "$KIBANA_BUILD_LOCATION"

source .buildkite/scripts/steps/test/scout_upload_report_events.sh
