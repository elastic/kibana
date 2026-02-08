#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Running Scout API Integration Tests'
node scripts/scout.js run-tests \
--stateful \
--config src/platform/packages/shared/kbn-scout/test/scout/api/playwright.config.ts \
--kibana-install-dir "$KIBANA_BUILD_LOCATION"

echo '--- Checking EUI Website Availability'
eui_check_exit=0
ts-node src/platform/packages/shared/kbn-scout/test/scout/scripts/check_eui_availability.ts || eui_check_exit=$?
if [ "$eui_check_exit" -eq 0 ]; then
  echo '--- Running Scout EUI Helpers Tests'
  SCOUT_TARGET_TYPE='local' SCOUT_TARGET_MODE='serverless=security' \
  "${KIBANA_DIR:-$(pwd)}/node_modules/.bin/playwright" test \
    --project local \
    --grep @svlSecurity \
    --config src/platform/packages/shared/kbn-scout/test/scout/ui/playwright.config.ts
else
  echo 'EUI website is not available - skipping EUI Helpers Tests'
fi

source .buildkite/scripts/steps/test/scout_upload_report_events.sh
