#!/bin/bash

set -euo pipefail

echo "--- Verify $BUILDKITE_COMMIT exists in origin/$BUILDKITE_BRANCH"
# Step 1: Check if the commit is in the specific named branch
if git merge-base --is-ancestor $BUILDKITE_COMMIT origin/$BUILDKITE_BRANCH; then
    echo "Commit $BUILDKITE_COMMIT is part of the $BUILDKITE_BRANCH branch"

    # Step 2: Check if the commit is also part of any other branches
    # This command lists all branches containing the commit and counts them
    branches_containing_commit=$(git branch -r --contains $BUILDKITE_COMMIT | wc -l)

    # If the commit is in more than one branch, exit with non-zero
    if [[ $branches_containing_commit -gt 1 ]]; then
        echo "Error: Commit $BUILDKITE_COMMIT is part of multiple branches."
        exit 1
    else
        echo "Commit $BUILDKITE_COMMIT is uniquely part of the $BUILDKITE_BRANCH branch."
    fi
else
    echo "Commit $BUILDKITE_COMMIT is not part of the $BUILDKITE_BRANCH branch."
    exit 1
fi

echo "--- Create tag $BUILDKITE_BRANCH"
git tag "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"

echo "--- Push tag $BUILDKITE_BRANCH"
git push origin tag "$BUILDKITE_BRANCH"
