#!/usr/bin/env bash

set -euo pipefail

# Posts the summaries the task steps uploaded as one PR comment per task.

PR_NUMBER="${GITHUB_PR_NUMBER:-${BUILDKITE_PULL_REQUEST:-}}"
if [[ -z "$PR_NUMBER" || "$PR_NUMBER" == "false" ]]; then
  echo "Not a PR build; skipping the PR comment."
  exit 0
fi

source .buildkite/scripts/common/util.sh

buildkite-agent artifact download "target/nightshift-evals/**/summary.md" . || {
  echo "No summaries to post."
  exit 0
}

export GITHUB_PR_NUMBER="$PR_NUMBER"
IFS=',' read -ra tasks <<<"${NIGHTSHIFT_EVAL_TASKS:-}"
for task in "${tasks[@]}"; do
  summaries="$(find target/nightshift-evals -path "*/${task}-*" -name summary.md | sort)"
  [[ -z "$summaries" ]] && continue
  echo "--- Posting the ${task} comment on PR #${PR_NUMBER}"
  for file in $summaries; do
    # The directory is `<task>-<connector>`; show the connector above its summary.
    printf '### %s\n\n' "$(basename "$(dirname "$(dirname "$(dirname "$file")")")")"
    cat "$file"
    printf '\n\n'
  done | NIGHTSHIFT_EVAL_TASK="$task" node .buildkite/scripts/steps/nightshift_evals/post_pr_comment.ts
done
