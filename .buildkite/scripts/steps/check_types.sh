#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types
echo skipped for now
# node scripts/type_check
