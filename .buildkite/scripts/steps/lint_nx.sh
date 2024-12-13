#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
node scripts/stylelint
echo "stylelint ✅"

echo '--- Lint: Linting affected packages with NX'
node_modules/.bin/nx-cloud record --\
 node_modules/.bin/nx affected \
 -t lint \
 --base=${OVERRIDE_MERGE_BASE:-${BUILDKITE_OVERRIDE_MERGE_BASE:-main}} \
 --head=${OVERRIDE_MERGE_HEAD:-HEAD} \
 --parallel 3
