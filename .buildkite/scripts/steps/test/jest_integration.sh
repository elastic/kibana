#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/setup_es_snapshot_cache.sh

echo '--- Jest Integration Tests'
# Capture the exit code so the artifact-upload logic runs unconditionally.
# Note: this script is shared across multiple pipelines (fips.yml,
# node_glibc_217.yml, es_snapshots/verify.yml, etc.). Those pipelines have no
# workflow-step-schema commit step, so the upload below is simply unconsumed —
# harmless.
set +e
.buildkite/scripts/steps/test/jest_parallel.sh jest.integration.config.js
exitCode=$?
set -e

# The workflow step-schema integration config rewrites its committed artifact in
# place. When this shard owned that config and the output drifted, hand the
# updated tree to the downstream commit step.
SCHEMA_DIR="src/platform/packages/private/kbn-workflow-step-schema-cli/generated"
if [[ $exitCode -eq 0 && -n "$(git status --porcelain -- "$SCHEMA_DIR")" ]]; then
  echo "--- Uploading drifted workflow step schema artifact"
  buildkite-agent artifact upload "$SCHEMA_DIR/**/*"
fi

exit $exitCode
