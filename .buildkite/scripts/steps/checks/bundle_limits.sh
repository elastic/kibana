#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Bundle Limits
node scripts/build_kibana_platform_plugins --validate-limits

# [rspack-transition] Also validate rspack limits
echo --- Check RSPack Bundle Limits
node scripts/build_rspack_bundles --validate-limits
