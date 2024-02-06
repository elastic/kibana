#!/bin/bash

set -euo pipefail

git tag "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"
git push origin tag "$BUILDKITE_BRANCH"
