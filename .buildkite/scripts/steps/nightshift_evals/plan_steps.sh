#!/usr/bin/env bash

set -euo pipefail

# Clones nightshift-evals, reads its ci/tasks.yaml and uploads one step per task and model.
# Selection comes from GITHUB_PR_LABELS (PR) or NIGHTSHIFT_EVAL_TASK + EVAL_MODEL_GROUPS
# (on-demand builds). See plan_steps.ts.

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/nightshift_evals/common.sh

nightshift_clone

PLAN_FILE="$(mktemp -t nightshift-evals-plan.XXXXXX.yml)"
trap 'rm -f "$PLAN_FILE"' EXIT

NIGHTSHIFT_EVALS_DIR="$NIGHTSHIFT_EVALS_DIR" node .buildkite/scripts/steps/nightshift_evals/plan_steps.ts >"$PLAN_FILE"

echo "--- Uploading nightshift-evals steps"
cat "$PLAN_FILE"
buildkite-agent pipeline upload "$PLAN_FILE"
