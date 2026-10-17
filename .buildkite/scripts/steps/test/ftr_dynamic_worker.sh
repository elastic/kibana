#!/usr/bin/env bash
set -euo pipefail
node .buildkite/scripts/steps/test/ftr_dynamic_worker.ts --probe
source .buildkite/scripts/steps/functional/common.sh
export FTR_SKIP_SETUP=true
node .buildkite/scripts/steps/test/ftr_dynamic_worker.ts
