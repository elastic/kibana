#!/usr/bin/env bash

set -euo pipefail

# node scripts/build rebuilds shared webpack bundles in production mode,
# so skip the dev-mode pre-build during bootstrap.
export KBN_BOOTSTRAP_NO_PREBUILT=true

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana.sh
.buildkite/scripts/post_build_kibana.sh
.buildkite/scripts/saved_object_field_metrics.sh
