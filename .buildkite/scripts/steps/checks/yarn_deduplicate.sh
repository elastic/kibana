#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Check pnpm-lock.yaml for duplicated modules"
node scripts/yarn_deduplicate && node scripts/kbn bootstrap --force-install

check_for_changed_files 'node scripts/yarn_deduplicate' true 'TO FIX: Run node '"'"'scripts/yarn_deduplicate && node scripts/kbn bootstrap'"'"' locally, then commit the changes and push to your branch'
