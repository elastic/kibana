#!/usr/bin/env bash

set -euo pipefail

# Skip building shared webpack bundles during bootstrap because
# node scripts/build rebuilds them in production mode with --dist
export KBN_BOOTSTRAP_NO_PREBUILT=true

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana.sh
.buildkite/scripts/post_build_kibana.sh
