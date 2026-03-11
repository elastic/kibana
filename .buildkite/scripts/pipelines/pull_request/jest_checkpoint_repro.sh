#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

ALERTING_SHARDS="x-pack/platform/plugins/shared/alerting/jest.config.js||shard=1/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=2/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=3/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=4/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=5/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=6/6"

echo "[jest-checkpoint-repro] retry=${BUILDKITE_RETRY_COUNT:-0} step=${BUILDKITE_STEP_ID:-} job=${BUILDKITE_PARALLEL_JOB:-0}"
echo "[jest-checkpoint-repro] running configs=${ALERTING_SHARDS}"

node ./scripts/jest_all --configs="${ALERTING_SHARDS}" --coverage=false --passWithNoTests --maxParallel=1

if [ "${BUILDKITE_RETRY_COUNT:-0}" = "0" ]; then
  echo "[jest-checkpoint-repro] forcing first attempt to fail to verify retry resume"
  exit 1
fi
