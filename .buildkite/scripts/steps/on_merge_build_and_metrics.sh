#!/usr/bin/env bash

set -euo pipefail

# Skip the moon-cache download; the distributable build does not use it.
export KBN_BOOTSTRAP_NO_PREBUILT=true

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana.sh
.buildkite/scripts/post_build_kibana.sh
.buildkite/scripts/saved_object_field_metrics.sh
