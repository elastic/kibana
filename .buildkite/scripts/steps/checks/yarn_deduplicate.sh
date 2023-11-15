#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Check yarn.lock for duplicated modules"
node scripts/yarn_deduplicate

check_for_changed_files 'node scripts/yarn_deduplicate && yarn kbn bootstrap' false
