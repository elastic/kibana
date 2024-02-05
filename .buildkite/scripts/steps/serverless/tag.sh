#!/bin/bash

set -euo pipefail

git tag "$BUILDKITE_BRANCH"
git push origin tag "$BUILDKITE_BRANCH"
