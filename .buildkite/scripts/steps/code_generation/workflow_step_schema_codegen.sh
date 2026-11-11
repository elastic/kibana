#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Workflow Step Schema Code Generation"

SCHEMA_CONFIG="src/platform/packages/private/kbn-workflow-step-schema-cli/integration_tests/jest.integration.config.js"
GENERATED_DIR="src/platform/packages/private/kbn-workflow-step-schema-cli/generated"
SYNC_BRANCH_PREFIX="workflow_step_schema_sync"
SYNC_PIPELINE="kibana-workflow-step-schema-sync"

# Only the sync PR (and the on-merge trigger that starts it) writes GENERATED_DIR;
# feature PRs never commit it, so concurrent PRs cannot conflict on it.
if [[ -n "${MERGE_QUEUE_TARGET_BRANCH:-}" ]]; then
  MODE="merge-queue"
elif [[ "${GITHUB_PR_OWNER:-}" == "elastic" && "${GITHUB_PR_BRANCH:-}" == "${SYNC_BRANCH_PREFIX}"* ]]; then
  MODE="sync-pr"
elif [[ "${BUILDKITE_PULL_REQUEST:-false}" != "false" ]]; then
  MODE="feature-pr"
else
  MODE="on-merge"
fi
echo "Mode: $MODE"

# The jest test writes unapproved step definitions here instead of failing, so the
# retry below is not spent on a deterministic failure.
APPROVAL_REPORT="$(mktemp)"
rm -f "$APPROVAL_REPORT"
export WORKFLOW_STEP_APPROVAL_REPORT="$APPROVAL_REPORT"

run_check() {
  node scripts/jest_integration --config "$SCHEMA_CONFIG"
}

has_generated_changes() {
  [[ -n "$(git status --porcelain --untracked-files=all -- "$GENERATED_DIR")" ]]
}

discard_generated_changes() {
  git checkout -- "$GENERATED_DIR"
  git clean -fdq -- "$GENERATED_DIR"
}

fail_on_unapproved_steps() {
  if [[ -s "$APPROVAL_REPORT" ]]; then
    cat "$APPROVAL_REPORT"
    buildkite-agent annotate "$(cat "$APPROVAL_REPORT")" --style error --context workflow-step-approval || true
    exit 1
  fi
}

# Booting ES + Kibana is the flakiest part of this check; mirror
# capture_oas_snapshot.sh and retry before failing the lane.
retry 5 15 run_check

case "$MODE" in
  sync-pr)
    # The sync PR is the one place the artifact is meant to change.
    check_for_changed_files "node scripts/jest_integration --config $SCHEMA_CONFIG" true
    ;;

  feature-pr)
    fail_on_unapproved_steps

    if has_generated_changes; then
      buildkite-agent annotate \
        "This PR changes the published workflow step schema. The schema is not committed here: the sync PR (\`[One Workflow] Update workflow step schema\`) updates it after merge." \
        --style info --context workflow-step-schema || true
    fi

    # Keep the PR's copy equal to its merge-base so only the target branch changes
    # the file and a later sync cannot conflict with this PR. This also undoes old
    # auto-commits and hand edits, once.
    git rm -rfq --ignore-unmatch -- "$GENERATED_DIR"
    git clean -fdq -- "$GENERATED_DIR"
    if ! git cat-file -e "${GITHUB_PR_MERGE_BASE}^{commit}" 2>/dev/null; then
      git fetch --quiet origin "$GITHUB_PR_MERGE_BASE"
    fi
    if git cat-file -e "${GITHUB_PR_MERGE_BASE}:${GENERATED_DIR}" 2>/dev/null; then
      git checkout "$GITHUB_PR_MERGE_BASE" -- "$GENERATED_DIR"
    fi
    check_for_changed_files "node scripts/jest_integration --config $SCHEMA_CONFIG" true \
      "Reset generated workflow step schema to the target branch (updated by the sync PR)"
    ;;

  merge-queue)
    # The queue branch is read-only and lands as tested: only run the guards.
    fail_on_unapproved_steps
    discard_generated_changes
    ;;

  on-merge)
    if has_generated_changes; then
      echo "--- Generated schema differs from the committed one, triggering $SYNC_PIPELINE"
      buildkite-agent pipeline upload <<EOF
steps:
  - trigger: ${SYNC_PIPELINE}
    label: ':arrows_counterclockwise: Sync workflow step schema'
    async: true
    build:
      branch: ${BUILDKITE_BRANCH}
      commit: HEAD
      message: 'Workflow step schema drift detected on ${BUILDKITE_COMMIT}'
EOF
      discard_generated_changes
    fi
    ;;
esac
