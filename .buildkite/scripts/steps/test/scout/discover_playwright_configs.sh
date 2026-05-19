#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests --concurrencyLimit 3

# Allow the caller (e.g. flaky-test-runner pipeline) to pin the discovery target via env.
# Falls back to detecting `main` via Buildkite env vars for regular PR/on-merge builds.
if [[ -z "${SCOUT_DISCOVERY_TARGET:-}" ]]; then
  if [[ "${BUILDKITE_BRANCH:-}" == "main" || "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-}" == "main" ]]; then
    SCOUT_DISCOVERY_TARGET="local"
  else
    SCOUT_DISCOVERY_TARGET="local-stateful-only"
  fi
fi

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
node scripts/scout discover-playwright-configs --include-custom-servers --target "$SCOUT_DISCOVERY_TARGET" --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

