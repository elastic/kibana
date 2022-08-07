#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Installing all packages'

checks-reporter-with-killswitch "Fleet packages Tests" \
 node scripts/functional_tests \
   --debug --bail \
   --config x-pack/test/fleet_packages/config.ts