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
  export NODE_OPTIONS="--max-old-space-size=8192"
  yarn moon run :typecheck -c 2 --affected --remote -u
fi
