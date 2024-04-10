#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Check yarn.lock for duplicated modules"
node scripts/yarn_deduplicate

check_for_changed_files 'node scripts/yarn_deduplicate' false 'TO FIX: Run node '"'"'scripts/yarn_deduplicate && yarn kbn bootstrap'"'"' locally, or add an exception to src/dev/yarn_deduplicate/index.ts and then commit the changes and push to your branch'
