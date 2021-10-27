#!/usr/bin/env bash

set -euo pipefail

# Note, changes here might also need to be made in other scripts, e.g. uptime.sh

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

export KIBANA_BUILD_ID="90bfc8e5-5ebb-40c8-88a9-660b53562e9d"

.buildkite/scripts/download_build_artifacts.sh

is_test_execution_step
