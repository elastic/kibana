#!/usr/bin/env bash

# Combined entry point for the Scout step of the Flaky Test Runner pipeline:
#   1. Bootstraps Kibana
#   2. Discovers Playwright configs (writes the manifest to .scout/test_configs/)
#   3. Uploads the manifest as a BK artifact (kept for debugging visibility)
#   4. Runs the planner, which reads the manifest from disk and dynamically
#      uploads one BK step per (scoutConfig x arch x domain) mode.
#
# Combining (1)-(4) in a single step avoids paying for a second agent boot and an
# artifact download just to hand the manifest from one step to another. The generic
# `.buildkite/scripts/steps/test/scout/discover_playwright_configs.sh` is intentionally
# left untouched so it can keep being reused by other pipelines.

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests --concurrencyLimit 3

echo '--- Discover Playwright Configs'
node scripts/scout discover-playwright-configs --include-custom-servers --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

echo '--- Plan and upload Scout flaky steps'
ts-node .buildkite/pipelines/flaky_tests/pick_scout_flaky_run_order.ts
