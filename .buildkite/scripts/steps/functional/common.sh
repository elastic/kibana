#!/usr/bin/env bash

set -euo pipefail

# Note, changes here might also need to be made in other scripts, e.g. uptime.sh

source .buildkite/scripts/common/util.sh

export ES_SNAPSHOT_MANIFEST="https://storage.googleapis.com/kibana-ci-es-snapshots-daily/8.1.0/archives/20220121-002819_8892b770/manifest.json"

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

is_test_execution_step
