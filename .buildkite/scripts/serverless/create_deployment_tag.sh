#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_TAG="test-depl-$(date +%Y%m%d%H%M%S)"
KIBANA_COMMIT_SHA=$(buildkite-agent meta-data get commit-sha)

echo "--- Creating deployment tag $DEPLOYMENT_TAG at $KIBANA_COMMIT_SHA"

# Create a tag for the deployment
git tag -a "$DEPLOYMENT_TAG" "$KIBANA_COMMIT_SHA" \
 -m "Tagging release $KIBANA_COMMIT_SHA for deployment: $DEPLOYMENT_TAG"

# Push the tag to GitHub
git push origin --tags

echo "Created deployment tag: $DEPLOYMENT_TAG"
