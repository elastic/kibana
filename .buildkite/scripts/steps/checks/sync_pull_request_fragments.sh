#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Sync pull_request fragment registry"
node .buildkite/scripts/steps/checks/sync_pull_request_fragments.ts

# Regenerate the snapshots that follow the YAML on disk and the emitted step ids: unported fragments
# and the scenarios. A ported fragment's snapshot is skipped, because a change to it is a regression
# to review. The auto-commit makes every regenerated snapshot visible in the PR.
SKIP_PORTED_FRAGMENTS=true npm test --prefix .buildkite -- -u \
  pipeline-utils/step-library/fragments.test.ts \
  scripts/pipelines/pull_request/pipeline.scenarios.test.ts

check_for_changed_files 'node .buildkite/scripts/steps/checks/sync_pull_request_fragments.ts' true
