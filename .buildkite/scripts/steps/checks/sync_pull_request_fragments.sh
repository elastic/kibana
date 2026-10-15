#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Sync pull_request fragment registry"
node .buildkite/scripts/steps/checks/sync_pull_request_fragments.ts

# `--ci=false` writes snapshots for new fragments but never rewrites an existing one: a changed
# snapshot of a ported fragment is a regression to review, not something to regenerate.
CI=false npm test --prefix .buildkite -- --ci=false pipeline-utils/step-library/fragments.test.ts

# The scenario snapshots follow the emitted step ids, which change whenever pipeline.ts or a YAML
# fragment changes. The auto-commit makes the regenerated ids visible in the PR.
CI=false npm test --prefix .buildkite -- --ci=false -u scripts/pipelines/pull_request/pipeline.scenarios.test.ts

check_for_changed_files 'node .buildkite/scripts/steps/checks/sync_pull_request_fragments.ts' true
