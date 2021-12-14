#!/bin/bash

set -euo pipefail

export BAZEL_CACHE_MODE=read-write
export DISABLE_BOOTSTRAP_VALIDATION=true

# Since our Mac agents are currently static,
# use a temporary HOME directory that gets cleaned out between builds
TMP_HOME="$WORKSPACE/tmp_home"
rm -rf "$TMP_HOME"
export HOME="$TMP_HOME"

.buildkite/scripts/bootstrap.sh
