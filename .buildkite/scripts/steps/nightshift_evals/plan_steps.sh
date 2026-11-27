#!/usr/bin/env bash

set -euo pipefail

# Clones nightshift-evals, reads its ci/tasks.yaml and uploads one step per task.
# See plan_steps.ts.

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/nightshift_evals/common.sh

nightshift_clone

# Resolve the revision once. The run steps check out this commit, so the args and downloads
# read below and the code that scores the run come from the same revision.
NIGHTSHIFT_EVALS_REF="$(git -C "$NIGHTSHIFT_EVALS_DIR" rev-parse HEAD)"
export NIGHTSHIFT_EVALS_REF

PLAN_FILE="$(mktemp -t nightshift-evals-plan.XXXXXX.yml)"
trap 'rm -f "$PLAN_FILE"' EXIT

NIGHTSHIFT_EVALS_DIR="$NIGHTSHIFT_EVALS_DIR" node .buildkite/scripts/steps/nightshift_evals/plan_steps.ts >"$PLAN_FILE"

echo "--- Uploading nightshift-evals steps"
cat "$PLAN_FILE"
buildkite-agent pipeline upload "$PLAN_FILE"
