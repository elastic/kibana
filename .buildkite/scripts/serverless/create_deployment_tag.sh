#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_TAG="deploy@$(date +%s%3N)"
KIBANA_COMMIT_SHA=$(buildkite-agent meta-data get commit-sha)

if [[ -z "$KIBANA_COMMIT_SHA" ]]; then
  echo "Commit sha is not set, exiting"
  exit 1
fi

echo "--- Creating deploy tag $DEPLOYMENT_TAG at $KIBANA_COMMIT_SHA"

# Set git identity to whomever triggered the buildkite job
git config user.email "$BUILDKITE_BUILD_CREATOR_EMAIL"
git config user.name "$BUILDKITE_BUILD_CREATOR"

# Create a tag for the deploy
git tag -a "$DEPLOYMENT_TAG" "$KIBANA_COMMIT_SHA" \
 -m "Tagging release $KIBANA_COMMIT_SHA as: $DEPLOYMENT_TAG, by $BUILDKITE_BUILD_CREATOR_EMAIL"

# Push the tag to GitHub
if [[ -z "${DRY_RUN:-}" ]]; then
  echo "Pushing tag to GitHub"
  # git push origin --tags
else
  echo "Skipping push to GitHub due to DRY_RUN=$DRY_RUN"
fi

echo "Created deployment tag: $DEPLOYMENT_TAG"
