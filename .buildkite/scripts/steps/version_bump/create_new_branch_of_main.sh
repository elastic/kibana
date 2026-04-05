#!/usr/bin/env bash

set -euo pipefail

echo --- Create new branch off main

echo "Creating branch '$BRANCH' from main"

git config --global user.name kibanamachine
git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

git checkout main
git checkout -b "$BRANCH"
git push origin "$BRANCH"

echo "Branch '$BRANCH' created and pushed to origin"
