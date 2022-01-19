#!/usr/bin/env bash

set -euo pipefail

# Note, changes here might also need to be made in other scripts, e.g. uptime.sh

source .buildkite/scripts/common/util.sh

export ES_SNAPSHOT_MANIFEST="https://storage.googleapis.com/kibana-ci-es-snapshots-daily/8.1.0/archives/20220118-151627_25dd4a31/manifest.json"

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

is_test_execution_step
