#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Check pnpm-lock.yaml for duplicated modules"
node scripts/check_floating_dependency_tags.js

# dedupe re-resolves against the live registry (e.g. new deprecation notices), so only gate PRs on it
if [[ "${BUILDKITE_PULL_REQUEST:-false}" != "false" ]]; then
  node scripts/deduplicate_dependencies && node scripts/kbn bootstrap --force-install
  check_for_changed_files 'node scripts/deduplicate_dependencies' true
else
  echo "Skipping pnpm dedupe check outside of PR builds"
fi
