#!/usr/bin/env bash

# Combined entry point for the Scout step of the Flaky Test Runner pipeline:
#   1. Bootstraps Kibana
#   2. Runs the planner, which resolves ONLY the user-requested Scout configs
#      (`scout discover-playwright-configs --configs <paths>` writes the manifest to
#      .scout/test_configs/), then dynamically uploads one BK step per
#      (scoutConfig x arch x domain) mode.
#
# Unlike the generic discovery step, the flaky runner never discovers the whole repo:
# the user names exactly which configs to run, so we resolve just those. This keeps the
# step fast and immune to unrelated/broken/unregistered configs (which is why full
# discovery previously needed `--skip-validation` here). The generic
# `.buildkite/scripts/steps/test/scout/discover_playwright_configs.sh` is intentionally
# left untouched so it can keep being reused by other pipelines.

set -euo pipefail

source .buildkite/scripts/common/util.sh

# This step only runs Node scripts (scoped config resolution + flaky run-order
# planning); it never serves the Kibana UI, so skip building the dev-mode shared
# webpack bundles (monaco, ui-shared-deps) during bootstrap.
export KBN_BOOTSTRAP_NO_PREBUILT=true

.buildkite/scripts/bootstrap.sh

# `SCOUT_DISCOVERY_TARGET` is computed at pipeline-generation time from the
# `branch` field in package.json in .buildkite/pipelines/flaky_tests/pipeline.ts
# and injected as step-level env. Hard-require it here so a missing value fails
# loudly instead of silently defaulting to a wrong target. The planner reads it to
# scope discovery to the requested configs.
: "${SCOUT_DISCOVERY_TARGET:?SCOUT_DISCOVERY_TARGET must be set by the flaky pipeline generator}"

# The planner resolves ONLY the requested Scout configs (writing the manifest to
# .scout/test_configs/) and then uploads the per-(arch, domain) flaky steps.
echo '--- Resolve requested configs and plan Scout flaky steps'
ts-node .buildkite/pipelines/flaky_tests/pick_scout_flaky_run_order.ts
