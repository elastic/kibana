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
if [ "$GITHUB_PR_BRANCH" = "feature/213293/renovate-helper-scripts" ] && ! is_pr_with_label "ci:cloud-deploy"; then
  echo "Adding deploy label to main chainguard PR"
  git config --global user.name kibanamachine
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'
  # gh pr edit "${GITHUB_PR_NUMBER}" --add-label "ci:cloud-deploy"
  gh api "repos/elastic/kibana/issues/${GITHUB_PR_NUMBER}/labels" --method POST -f "labels[]=ci:cloud-deploy"
fi
