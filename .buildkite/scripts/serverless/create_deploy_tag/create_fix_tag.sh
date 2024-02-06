#!/bin/bash

set -euo pipefail

echo "--- Verify $BUILDKITE_COMMIT exists in $BUILDKITE_BRANCH"
git branch --contains $BUILDKITE_COMMIT | grep -q $BUILDKITE_BRANCH

echo "--- Create tag $BUILDKITE_BRANCH"
git tag "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"

echo "--- Push tag $BUILDKITE_BRANCH"
git push origin tag "$BUILDKITE_BRANCH"
