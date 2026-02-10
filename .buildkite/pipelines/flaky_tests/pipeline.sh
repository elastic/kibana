#!/usr/bin/env bash

set -euo pipefail

UUID="$(cat /proc/sys/kernel/random/uuid)"
export UUID

# If Scout flaky configs are requested, generate the discovered config manifest first so
# `.buildkite/pipelines/flaky_tests/pipeline.ts` can reliably read `serverRunFlags`.
if [[ "${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}" == *scoutConfig* ]]; then
  {
    echo '--- Update Scout Test Config Manifests'
    node scripts/scout.js update-test-config-manifests

    echo '--- Discover Playwright Configs (for serverRunFlags)'
    node scripts/scout discover-playwright-configs --include-custom-servers --save
    cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
  } >&2
fi

ts-node .buildkite/pipelines/flaky_tests/pipeline.ts
