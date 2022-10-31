#!/usr/bin/env bash

set -euo pipefail

export BAZEL_CACHE_MODE=buildbuddy # Populate Buildbuddy bazel remote cache for linux
export DISABLE_BOOTSTRAP_VALIDATION=true

.buildkite/scripts/bootstrap.sh

echo "--- Build API Docs"
node --max-old-space-size=12000 scripts/build_api_docs
