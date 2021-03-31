#!/usr/bin/env bash

set -euo pipefail

# TODO enable
export BUILD_TS_REFS_CACHE_ENABLE=true
export BUILD_TS_REFS_CACHE_CAPTURE=true
export DISABLE_BOOTSTRAP_VALIDATION=true

.ci/buildkite/bootstrap.sh
.ci/buildkite/default_build.sh
.ci/buildkite/default_saved_object_field_metrics.sh
