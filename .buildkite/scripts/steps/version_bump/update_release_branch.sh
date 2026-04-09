#!/usr/bin/env bash

set -euo pipefail

echo --- Update release branch configuration

git config --global user.name kibanamachine
git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

git checkout "$BRANCH"

echo "Updating branch property in package.json to '$BRANCH'"
jq --arg branch "$BRANCH" '.branch = $branch' package.json > package.json.tmp && mv package.json.tmp package.json

git add package.json
git commit -m "[release branch setup] Set branch to ${BRANCH}"

git push origin "$BRANCH"

echo "Release branch '$BRANCH' updated successfully"
