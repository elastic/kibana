#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh
.buildkite/scripts/copy_es_snapshot_cache.sh

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'

set +e;
node scripts/scout discover-playwright-configs --save --validate
EXIT_CODE=$?
set -e;

if [[ $EXIT_CODE -ne 0 ]]; then
  echo "Exiting with code $EXIT_CODE without retrying"
  buildkite-agent meta-data set "${BUILDKITE_STEP_ID}" "Scout Test Run Builder failed, check logs for details"
  exit 10  # Exit with the specific code 10
fi

cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

echo '--- Scout Test Run Builder'
ts-node "$(dirname "${0}")/scout_test_run_builder.ts"
