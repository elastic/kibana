#!/bin/bash

set -euo pipefail

git cat-file -e "$BUILDKITE_COMMIT"
git tag "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"
git push origin tag "$BUILDKITE_BRANCH"
