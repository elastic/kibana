#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types
if ! which nx > /dev/null; then
  echo "Nx not found by name, trying to use local version"
  ./node_modules/.bin/nx affected --target=typecheck_fast --nxIgnoreCycles --parallel 3
else
  nx affected --target=typecheck_fast --nxIgnoreCycles --parallel 3
fi
