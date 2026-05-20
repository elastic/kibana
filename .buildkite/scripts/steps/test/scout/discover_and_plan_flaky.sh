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

# `SCOUT_DISCOVERY_TARGET` is computed at pipeline-generation time from the
# `branch` field in package.json in .buildkite/pipelines/flaky_tests/pipeline.ts
# and injected as step-level env. Hard-require it here so a missing value fails
# loudly instead of silently defaulting to a wrong target.
: "${SCOUT_DISCOVERY_TARGET:?SCOUT_DISCOVERY_TARGET must be set by the flaky pipeline generator}"

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests --concurrencyLimit 3

echo "--- Discover Playwright Configs (target=$SCOUT_DISCOVERY_TARGET)"
node scripts/scout discover-playwright-configs --include-custom-servers --target "$SCOUT_DISCOVERY_TARGET" --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

echo '--- Plan and upload Scout flaky steps'
ts-node .buildkite/pipelines/flaky_tests/pick_scout_flaky_run_order.ts
