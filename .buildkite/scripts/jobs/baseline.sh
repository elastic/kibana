#!/usr/bin/env bash

set -euo pipefail

export BUILD_TS_REFS_CACHE_ENABLE=true
export BUILD_TS_REFS_CACHE_CAPTURE=true
export DISABLE_BOOTSTRAP_VALIDATION=true

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana.sh
.buildkite/scripts/saved_object_field_metrics.sh
