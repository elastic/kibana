#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo "--- Verify Legacy Optimizer Build"
KBN_USE_RSPACK=false node scripts/build_kibana_platform_plugins --dist
