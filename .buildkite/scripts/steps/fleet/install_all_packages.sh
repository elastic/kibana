#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo '--- Installing all packages'

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Fleet packages Tests" \
 node scripts/functional_tests \
   --debug --bail \
   --config x-pack/test/fleet_packages/cli_config.ts