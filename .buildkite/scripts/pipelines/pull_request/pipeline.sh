#!/bin/bash

set -euo pipefail

echo --- Pre-Build
.buildkite/scripts/lifecycle/pre_build.sh
source .buildkite/scripts/lifecycle/setup_ci_stats.sh

echo --- Upload Pipeline
ts-node .buildkite/scripts/pipelines/pull_request/pipeline.ts

echo --- Pick Test Group Run Order
export JEST_UNIT_SCRIPT=.buildkite/scripts/steps/test/jest.sh
export JEST_INTEGRATION_SCRIPT=.buildkite/scripts/steps/test/jest_integration.sh
export FTR_CONFIGS_SCRIPT=.buildkite/scripts/steps/test/ftr_configs.sh
.buildkite/scripts/steps/test/pick_test_group_run_order.sh
