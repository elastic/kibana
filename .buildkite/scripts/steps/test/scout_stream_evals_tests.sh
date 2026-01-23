#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Running Scout Streams evals'
node scripts/scout.js run-tests --config x-pack/platform/packages/shared/kbn-evals-suite-streams/playwright.config.ts --kibana-install-dir "$KIBANA_BUILD_LOCATION"

source .buildkite/scripts/steps/test/scout_upload_report_events.sh
