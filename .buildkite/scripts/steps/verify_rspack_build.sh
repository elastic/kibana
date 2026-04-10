#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Verify Rspack Optimizer Build"
.buildkite/scripts/bootstrap.sh
node scripts/build_rspack_bundles --dist
