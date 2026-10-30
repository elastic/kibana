#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/setup_es_snapshot_cache.sh

echo --- Check server module graph
node scripts/check_server_module_graph
