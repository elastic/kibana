#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Workflow Step Schema Code Generation"

SCHEMA_CONFIG="src/platform/packages/private/kbn-workflow-step-schema-cli/integration_tests/jest.integration.config.js"
GENERATED_DIR="src/platform/packages/private/kbn-workflow-step-schema-cli/generated"
STEP_CONTRACTS_DIR="x-pack/platform/plugins/shared/workflows_extensions/contracts/steps"
SYNC_BRANCH_PREFIX="workflow_step_schema_sync"
SYNC_PIPELINE="kibana-workflow-step-schema-sync"

# Only the sync PR (and the on-merge trigger that starts it) writes GENERATED_DIR;
# feature PRs never commit it, so concurrent PRs cannot conflict on it. Feature PRs
# do commit STEP_CONTRACTS_DIR: it has one file per step, so two PRs only conflict
# when they change the same step.
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

run_check() {
  node scripts/jest_integration --config "$SCHEMA_CONFIG"
}

has_changes() {
  [[ -n "$(git status --porcelain --untracked-files=all -- "$1")" ]]
}

discard_changes() {
  if git ls-files --error-unmatch -- "$1" >/dev/null 2>&1; then
    git checkout -- "$1"
  fi
  git clean -fdq -- "$1"
}

# Compares the step contracts the jest test wrote with the ones at the merge base, and
# annotates the build with what changed. Fails on breaking changes the allowlist doesn't accept.
check_step_contracts() {
  echo "--- Check workflow step contracts for breaking changes"
  local report status=0
  report="$(mktemp)"
  node scripts/check_workflow_step_contracts --base "$GITHUB_PR_MERGE_BASE" --report "$report" || status=$?
  if [[ -s "$report" ]]; then
    local style=info
    if [[ "$status" -ne 0 ]]; then
      style=error
    fi
    buildkite-agent annotate "$(cat "$report")" --style "$style" --context workflow-step-contracts || true
  fi
  return "$status"
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
    if ! git cat-file -e "${GITHUB_PR_MERGE_BASE}^{commit}" 2>/dev/null; then
      git fetch --quiet origin "$GITHUB_PR_MERGE_BASE"
    fi

    # Checked before the contracts are committed but enforced after, so the PR shows the
    # contract changes that the annotation lists.
    STEP_CONTRACTS_STATUS=0
    check_step_contracts || STEP_CONTRACTS_STATUS=$?

    if has_changes "$GENERATED_DIR"; then
      buildkite-agent annotate \
        "This PR changes the published workflow step schema. The schema is not committed here: the sync PR (\`[One Workflow] Update workflow step schema\`) updates it after merge." \
        --style info --context workflow-step-schema || true
    fi

    COMMIT_MESSAGE="Reset generated workflow step schema to the target branch (updated by the sync PR)"
    if has_changes "$STEP_CONTRACTS_DIR"; then
      COMMIT_MESSAGE="Update workflow step contracts"
    fi

    # Keep the PR's copy equal to its merge-base so only the target branch changes
    # the file and a later sync cannot conflict with this PR. This also undoes old
    # auto-commits and hand edits, once.
    git rm -rfq --ignore-unmatch -- "$GENERATED_DIR"
    git clean -fdq -- "$GENERATED_DIR"
    if git cat-file -e "${GITHUB_PR_MERGE_BASE}:${GENERATED_DIR}" 2>/dev/null; then
      git checkout "$GITHUB_PR_MERGE_BASE" -- "$GENERATED_DIR"
    fi
    check_for_changed_files "node scripts/jest_integration --config $SCHEMA_CONFIG" true "$COMMIT_MESSAGE"

    if [[ "$STEP_CONTRACTS_STATUS" -ne 0 ]]; then
      exit 1
    fi
    ;;

  merge-queue)
    # The queue branch is read-only and lands as tested: only run the guards. PRs compare
    # their step contracts with the target branch's, so those must match the code.
    if has_changes "$STEP_CONTRACTS_DIR"; then
      git status --porcelain --untracked-files=all -- "$STEP_CONTRACTS_DIR"
      buildkite-agent annotate \
        "The committed workflow step contracts don't match the registered steps, probably because another PR changed the same steps. Merge the target branch into the PR so its CI updates them." \
        --style error --context workflow-step-contracts || true
      exit 1
    fi
    discard_changes "$GENERATED_DIR"
    ;;

  on-merge)
    # The merge queue keeps the step contracts in sync with the code, so a difference here
    # is only reported.
    if has_changes "$STEP_CONTRACTS_DIR"; then
      echo "The workflow step contracts differ from the committed ones:"
      git status --porcelain --untracked-files=all -- "$STEP_CONTRACTS_DIR"
      discard_changes "$STEP_CONTRACTS_DIR"
    fi

    if has_changes "$GENERATED_DIR"; then
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
      discard_changes "$GENERATED_DIR"
    fi
    ;;
esac
