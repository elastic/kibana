#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Bundle Limits
node scripts/build_rspack_bundles --validate-limits

# [rspack-transition] Also validate legacy optimizer limits
echo --- Check Legacy Bundle Limits
node scripts/build_kibana_platform_plugins --validate-limits
