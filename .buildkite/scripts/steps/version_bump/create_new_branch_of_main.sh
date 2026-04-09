#!/usr/bin/env bash

set -euo pipefail

echo --- Create new branch off main

echo "Creating branch '$BRANCH' from main"

git config --global user.name kibanamachine
git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

git fetch origin main
git checkout -b "$BRANCH" origin/main
git push origin "$BRANCH"

echo "Branch '$BRANCH' created and pushed to origin"
