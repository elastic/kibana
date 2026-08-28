#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# On pull requests, test the merged result (PR + latest target branch) instead
# of the PR branch head. This catches semantic conflicts with commits that
# landed on the target branch after the PR branched (e.g. moved fixtures,
# renamed exports, new lint rules, changed check configuration) in PR CI,
# before they can turn the target branch red on merge.
#
# The target commit is resolved once per build and pinned in build meta-data,
# so every job in the build merges against the same target SHA and produces an
# identical tree, even if the target branch advances while the build runs.
#
# BUILDKITE_COMMIT remains the PR head SHA: commit statuses, build
# deduplication, and CI metrics are unaffected; only the working tree changes.
#
# Opt out per PR with the ci:test-head-only label.
#
# Scoped to the kibana-pull-request pipeline: other PR-triggered pipelines
# (deploy-from-pr, storybooks-from-pr, …) intentionally build the PR head
# exactly as pushed.

merge_target_branch() {
  if [[ "${BUILDKITE_PIPELINE_SLUG:-}" != "kibana-pull-request" ]]; then
    return 0
  fi

  if ! is_pr; then
    return 0
  fi

  if is_pr_with_label "ci:test-head-only"; then
    echo "Skipping target-branch merge: PR has the ci:test-head-only label"
    return 0
  fi

  local target_sha
  target_sha="$(buildkite-agent meta-data get pr-merge-target-sha --default '')"

  if [[ -z "$target_sha" ]]; then
    # First job of the build (the pipeline upload job) resolves and pins the
    # target SHA. meta-data set is last-write-wins; re-read after setting so
    # that any concurrent early jobs converge on the same value.
    git fetch -f origin "$GITHUB_PR_TARGET_BRANCH"
    target_sha="$(git rev-parse FETCH_HEAD)"
    buildkite-agent meta-data set pr-merge-target-sha "$target_sha"
    target_sha="$(buildkite-agent meta-data get pr-merge-target-sha)"
  fi

  if ! git cat-file -e "${target_sha}^{commit}" 2>/dev/null; then
    git fetch -f origin "$target_sha"
  fi

  echo "--- Merging $GITHUB_PR_TARGET_BRANCH @ ${target_sha:0:12} into the working tree"

  # Pin the merge base for this build before merging: with a merged HEAD,
  # merge-base(HEAD, target) would equal the target tip. Computing it here
  # (from the PR head) keeps set_git_merge_base() and selective testing
  # diffing the PR's own changes against the pinned target.
  GITHUB_PR_MERGE_BASE="$(git merge-base HEAD "$target_sha")"
  export GITHUB_PR_MERGE_BASE
  buildkite-agent meta-data set merge-base "$GITHUB_PR_MERGE_BASE"

  if ! git -c user.name=kibanamachine \
    -c user.email='42973632+kibanamachine@users.noreply.github.com' \
    merge --no-edit --no-ff "$target_sha"; then
    git merge --abort || true
    echo "^^^ +++"
    echo "This pull request has conflicts with $GITHUB_PR_TARGET_BRANCH." \
      "Merge or rebase $GITHUB_PR_TARGET_BRANCH into your branch and push."
    exit 1
  fi
}

merge_target_branch
unset -f merge_target_branch
