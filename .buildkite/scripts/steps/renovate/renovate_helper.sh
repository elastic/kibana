#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo --- Deduplicate yarn.lock
cmd="node scripts/yarn_deduplicate.js && yarn kbn bootstrap && node scripts/yarn_deduplicate.js"
eval "$cmd"
check_for_changed_files "$cmd" true

#TODO: add label helper
