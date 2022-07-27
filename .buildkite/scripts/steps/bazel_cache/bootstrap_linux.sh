#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export BAZEL_CACHE_MODE=populate-local-gcs
export DISABLE_BOOTSTRAP_VALIDATION=true

# Clear out bazel cache between runs to make sure that any artifacts that don't exist in the cache are uploaded
rm -rf ~/.bazel-cache

.buildkite/scripts/bootstrap.sh
