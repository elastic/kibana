#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# logic is different for PRs
if [ "$GITHUB_PR_TARGET_BRANCH" != "" ]; then
  # ignore prs targetting main
  if [ "$GITHUB_PR_TARGET_BRANCH" != "main" ]; then
    # try to find a version matching the target branch
    version=$(jq '.versions[] | select(.branch == env.GITHUB_PR_TARGET_BRANCH) | .version' versions.json)
    # if the target branch represents a tracked version then run the check
    if [ "$version" != "" ]; then
      echo "--- removing codeowners file"
      rm .github/CODEOWNERS || true
      check_for_changed_files 'rm .github/CODEOWNERS' true
    fi
  fi
# when we're running on-merge or something on a non-pr
elif [ "$BUILDKITE_BRANCH" != "main" ]; then
  # try to find a version matching the branch being built
  version=$(jq '.versions[] | select(.branch == env.BUILDKITE_BRANCH) | .version' versions.json)
  # if the branch being built represents a tracked version then run the check
  if [ "$version" != "" ]; then
    echo "--- removing codeowners file"
    rm .github/CODEOWNERS || true
    check_for_changed_files 'rm .github/CODEOWNERS' true
  fi
fi
