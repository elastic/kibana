#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo --- Deduplicate yarn.lock
cmd="node scripts/yarn_deduplicate.js && yarn kbn bootstrap && node scripts/yarn_deduplicate.js"
eval "$cmd"
check_for_changed_files "$cmd" true

echo --- Additional helpers
# We only want the deploy label on the main branch instead of all branches in the Renovate group
if [ "$GITHUB_PR_BRANCH" = "renovate/main-chainguard" ] && ! is_pr_with_label "ci:cloud-deploy"; then
  echo "Adding deploy label to main chainguard PR"
  gh api "repos/elastic/kibana/issues/${GITHUB_PR_NUMBER}/labels" --method POST -f "labels[]=ci:cloud-deploy" >/dev/null

  # Sync GITHUB_PR_LABELS variable since we're passing it along to the PR pipeline
  if [ -n "${GITHUB_PR_LABELS:-}" ]; then
    export GITHUB_PR_LABELS="${GITHUB_PR_LABELS},ci:cloud-deploy"
  else
    export GITHUB_PR_LABELS="ci:cloud-deploy"
  fi
fi
