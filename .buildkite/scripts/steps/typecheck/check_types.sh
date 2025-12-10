#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types

if is_pr; then
  node scripts/type_check --with-archive
else
  node scripts/type_check
fi
