#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types
if [[ "${RUN_FULL_CHECK:-}" == "true" ]]; then
  echo "Running full type check..."
  node scripts/type_check
else
  echo "Running type-check with caches..."
  yarn moon ci :typecheck -c 3 \
    --job $BUILDKITE_PARALLEL_JOB \
    --jobTotal $BUILDKITE_PARALLEL_JOB_COUNT \
    --base $BUILDKITE_PULL_REQUEST_BASE_BRANCH
fi
