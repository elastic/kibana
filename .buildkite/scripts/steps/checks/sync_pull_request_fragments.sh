#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Sync pull_request fragment registry"
node .buildkite/scripts/steps/checks/sync_pull_request_fragments.ts

# `--ci=false` writes snapshots for new fragments but never rewrites an existing one: a changed
# snapshot of a ported fragment is a regression to review, not something to regenerate.
CI=false npm test --prefix .buildkite -- --ci=false pipeline-utils/step-library/fragments.test.ts

check_for_changed_files 'node .buildkite/scripts/steps/checks/sync_pull_request_fragments.ts' true
