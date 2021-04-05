#!/usr/bin/env bash

set -euo pipefail

export BUILD_TS_REFS_CACHE_ENABLE=true
export BUILD_TS_REFS_CACHE_CAPTURE=true
export DISABLE_BOOTSTRAP_VALIDATION=true

.ci/buildkite/bootstrap.sh
.ci/buildkite/build_kibana.sh
.ci/buildkite/saved_object_field_metrics.sh
