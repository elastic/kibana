#!/usr/bin/env bash

set -euo pipefail

# Note, changes here might also need to be made in other scripts, e.g. uptime.sh

# TEMP: DO NOT MERGE
export ES_SNAPSHOT_MANIFEST="https://storage.googleapis.com/kibana-ci-es-snapshots-daily/8.0.2/archives/20220301-190149_d95c69ce/manifest.json"

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

is_test_execution_step
