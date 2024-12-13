#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

nx-cloud record --\
 nx affected \
 -t jest \
 --base=${OVERRIDE_MERGE_BASE:-${BUILDKITE_OVERRIDE_MERGE_BASE:-main}} \
 --head=${OVERRIDE_MERGE_HEAD:-HEAD} \
 --parallel 3
