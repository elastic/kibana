#!/usr/bin/env bash
set -euo pipefail
source .buildkite/scripts/common/util.sh
download_tmp_artifact ftr_dynamic_plan.json . "$BUILDKITE_BUILD_ID"
node .buildkite/scripts/steps/test/ftr_dynamic_coordinator.ts
