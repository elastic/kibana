#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Installing all packages'

node scripts/functional_tests \
  --debug \
  --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --config x-pack/platform/test/fleet_packages/config.ts
