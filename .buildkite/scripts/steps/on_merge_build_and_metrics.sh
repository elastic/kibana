#!/usr/bin/env bash

set -euo pipefail

# Write Bazel cache for Linux
.buildkite/scripts/common/persist_bazel_cache.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana.sh
.buildkite/scripts/post_build_kibana.sh
.buildkite/scripts/saved_object_field_metrics.sh
