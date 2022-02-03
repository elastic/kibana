#!/usr/bin/env bash

set -euo pipefail

export BAZEL_CACHE_MODE=read-write # Populate bazel remote cache for linux
export BUILD_TS_REFS_CACHE_ENABLE=true
export BUILD_TS_REFS_CACHE_CAPTURE=true
export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=false

.buildkite/scripts/bootstrap.sh

echo "--- Build API Docs"
node --max-old-space-size=12000 scripts/build_api_docs
