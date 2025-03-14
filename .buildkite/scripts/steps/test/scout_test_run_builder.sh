#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh
.buildkite/scripts/copy_es_snapshot_cache.sh

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'

set +e;
OUTPUT=$(node scripts/scout discover-playwright-configs --save --validate 2>&1)
EXIT_CODE=$?
set -e;

if [[ $EXIT_CODE -ne 0 ]]; then
  echo "Exiting with code 10 without retrying"
  ERROR_MSG=$(echo "$OUTPUT" | grep -A 10 "ERROR" | sed -E 's/\x1b\[[0-9;]*m//g')
{
  echo "$ERROR_MSG"
} | buildkite-agent annotate --style "error" --context "unregistered-playwright-configs"
  exit 10
fi

echo "$OUTPUT"

cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

echo '--- Scout Test Run Builder'
ts-node "$(dirname "${0}")/scout_test_run_builder.ts"
