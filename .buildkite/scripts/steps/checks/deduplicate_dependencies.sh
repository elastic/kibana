#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Check pnpm-lock.yaml for duplicated modules"
node scripts/check_floating_dependency_tags.js
node scripts/deduplicate_dependencies && node scripts/kbn bootstrap --force-install

check_for_changed_files 'node scripts/deduplicate_dependencies' true
