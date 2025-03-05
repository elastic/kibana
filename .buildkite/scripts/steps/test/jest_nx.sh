#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Jest: Unit tests with NX'
node_modules/.bin/nx affected \
 -t jest \
 --base=${OVERRIDE_MERGE_BASE:-${BUILDKITE_OVERRIDE_MERGE_BASE:-main}} \
 --head=${OVERRIDE_MERGE_HEAD:-HEAD} \
 --parallel 3
