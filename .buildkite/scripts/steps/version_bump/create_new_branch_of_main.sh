#!/usr/bin/env bash

set -euo pipefail

echo --- Create new branch off main

branch="$BRANCH"
if [ "${DRY_RUN:-}" = "true" ]; then
  version_suffix="${NEW_VERSION:-unknown-version}"
  branch="dry-run-${BRANCH}-${version_suffix}-$(date +%F_%H-%M-%S)"
  echo "DRY_RUN is enabled — creating temporary branch '$branch' instead of '$BRANCH'"
else
  echo "Creating branch '$branch' from main"
fi

git config --global user.name kibanamachine
git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

git fetch origin main
git checkout -b "$branch" origin/main
if [ "${DRY_RUN:-}" = "true" ]; then
  git push origin "$branch"
  buildkite-agent meta-data set "version_bump:dry_run_branch" "$branch"
  echo "DRY_RUN temporary branch '$branch' was pushed"
else
  git push origin "$branch"
  echo "Branch '$branch' created and pushed to origin"
fi
