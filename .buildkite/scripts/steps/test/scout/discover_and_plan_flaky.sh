#!/usr/bin/env bash

# Scout step of the Flaky Test Runner pipeline: bootstrap Kibana, then run the planner.
# The planner resolves ONLY the user-requested configs and uploads one BK step per
# (scoutConfig x arch x domain) mode. Unlike the generic discovery step it never scans
# the whole repo, keeping the step fast and immune to unrelated/broken configs.

set -euo pipefail

source .buildkite/scripts/common/util.sh

# Only runs Node scripts (never serves the UI), so skip the dev-mode shared webpack bundles.
export KBN_BOOTSTRAP_NO_PREBUILT=true

.buildkite/scripts/bootstrap.sh

# Injected as step env by the pipeline generator; require it so a missing value fails loudly.
: "${SCOUT_DISCOVERY_TARGET:?SCOUT_DISCOVERY_TARGET must be set by the flaky pipeline generator}"

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests --concurrencyLimit 3

echo '--- Resolve requested configs and plan Scout flaky steps'
ts-node .buildkite/pipelines/flaky_tests/pick_scout_flaky_run_order.ts
