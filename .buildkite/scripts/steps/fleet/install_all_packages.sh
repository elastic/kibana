#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Installing all packages'
cd x-pack/plugins/fleet
node scripts/install_all_packages
