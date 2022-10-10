#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export BAZEL_CACHE_MODE=populate-local-gcs
export DISABLE_BOOTSTRAP_VALIDATION=true

# Because we're manually deleting node_modules and bazel directories in-between runs, we need to --force-install
export BOOTSTRAP_ALWAYS_FORCE_INSTALL=true

# Clear out bazel cache between runs to make sure that any artifacts that don't exist in the cache are uploaded
rm -rf ~/.bazel-cache

# Since our Mac agents are currently static,
# use a temporary HOME directory that gets cleaned out between builds
TMP_HOME="$WORKSPACE/tmp_home"
rm -rf "$TMP_HOME"
mkdir -p "$TMP_HOME"
export HOME="$TMP_HOME"

.buildkite/scripts/bootstrap.sh
