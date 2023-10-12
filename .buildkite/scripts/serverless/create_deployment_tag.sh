#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_TAG="test-depl-$(date +%Y%m%d%H%M%S)"

echo "--- Creating deployment tag $DEPLOYMENT_TAG"

# Create a tag for the deployment
git tag -a "$DEPLOYMENT_TAG" -m "Tagging release $HASH for deployment: $DEPLOYMENT_TAG"

# Push the tag to GitHub
git push origin --tags

echo "Created deployment tag: $DEPLOYMENT_TAG"
