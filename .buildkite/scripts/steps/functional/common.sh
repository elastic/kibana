#!/usr/bin/env bash

export ES_SNAPSHOT_MANIFEST="https://storage.googleapis.com/kibana-ci-es-snapshots-daily/8.2.0/manifest-latest-verified.json"

set -euo pipefail

# Note, changes here might also need to be made in other scripts, e.g. uptime.sh

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

is_test_execution_step
