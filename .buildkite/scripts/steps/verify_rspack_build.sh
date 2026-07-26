#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo "--- Verify Rspack Optimizer Build"
node scripts/build_rspack_bundles --dist
