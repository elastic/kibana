#!/usr/bin/env bash

set -euo pipefail

echo --- Called Renovate Helper
exit 0

source .buildkite/scripts/common/util.sh

echo --- Deduplicate yarn.lock
cmd="node scripts/yarn_deduplicate.js && yarn kbn bootstrap && node scripts/yarn_deduplicate.js"
eval "$cmd"
check_for_changed_files "$cmd" true
