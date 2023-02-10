#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Installing all packages'

node scripts/functional_tests \
  --debug \
  --bail \
  --config x-pack/test/fleet_packages/config.ts
