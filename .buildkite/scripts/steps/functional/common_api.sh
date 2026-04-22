#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# API-only FTR tests run Kibana from source — no distributable or webpack bundles needed.
export KBN_BOOTSTRAP_NO_PREBUILT=true

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/setup_es_snapshot_cache.sh

is_test_execution_step
