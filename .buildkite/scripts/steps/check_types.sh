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
  echo "NODE_OPTIONS=$NODE_OPTIONS"
  export NODE_OPTIONS="--max-old-space-size=8192"
  yarn moon ci :typecheck -c 1 \
    --base $BUILDKITE_PULL_REQUEST_BASE_BRANCH
fi
