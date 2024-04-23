#!/usr/bin/env bash
set -euo pipefail

DEPLOY_TAG="deploy@$(date +%s)"
KIBANA_COMMIT_SHA=$(buildkite-agent meta-data get selected-commit-hash)

if [[ -z "$KIBANA_COMMIT_SHA" ]]; then
  echo "Commit sha is not set, exiting."
  exit 1
fi

echo "--- Creating deploy tag $DEPLOY_TAG at $KIBANA_COMMIT_SHA"

echo "Fetching user identity from GitHub..."
IDENTITY_JSON=$(ts-node .buildkite/scripts/serverless/create_deploy_tag/get_github_identity.ts)

# Set git identity to whomever triggered the buildkite job
git config user.email "${BUILDKITE_BUILD_CREATOR_EMAIL:-$(echo ${IDENTITY_JSON} | jq .email)}"
git config user.name "${BUILDKITE_BUILD_CREATOR:-$(echo ${IDENTITY_JSON} | jq .name)}"

# Create a tag for the deploy
git tag -a "$DEPLOY_TAG" "$KIBANA_COMMIT_SHA" \
 -m "Tagging release $KIBANA_COMMIT_SHA as: $DEPLOY_TAG, by $BUILDKITE_BUILD_CREATOR_EMAIL"

# Set meta-data for the deploy tag
buildkite-agent meta-data set deploy-tag "$DEPLOY_TAG"

# Push the tag to GitHub
if [[ -z "${DRY_RUN:-}" ]]; then
  echo "Pushing tag to GitHub..."
  git push origin --tags
else
  echo "Skipping tag push to GitHub due to DRY_RUN=$DRY_RUN"
fi

echo "Created deploy tag: $DEPLOY_TAG"
