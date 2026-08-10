#!/usr/bin/env bash
#
# Downloads a drifted workflow step-schema artifact uploaded by the Jest
# integration lane and auto-commits it back to the PR.
#
# Called only when at least one integration shard uploaded a drifted artifact.
# When no artifact was uploaded (schema is up to date) the download exits
# non-zero and we bail out cleanly — this is the expected happy path, not a
# transient failure, so we do NOT use the retry-wrapped `download_artifact`
# helper from util.sh.

set -euo pipefail

source .buildkite/scripts/common/util.sh

SCHEMA_DIR="src/platform/packages/private/kbn-workflow-step-schema-cli/generated"

echo "--- Check for drifted workflow step schema artifact"
if ! buildkite-agent artifact download "$SCHEMA_DIR/**/*" .; then
  echo "Workflow step schema artifact is up to date — nothing to commit."
  exit 0
fi

GENERATE_CMD="node scripts/jest_integration --config src/platform/packages/private/kbn-workflow-step-schema-cli/integration_tests/jest.integration.config.js"

# On on_merge / merge_queue BUILDKITE_PULL_REQUEST is 'false', so
# check_for_changed_files will hard-fail with the regenerate command rather
# than committing to main — matching every other codegen script.
check_for_changed_files "$GENERATE_CMD" true
