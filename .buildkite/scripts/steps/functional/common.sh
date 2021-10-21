#!/usr/bin/env bash

set -euo pipefail

# Note, changes here might also need to be made in other scripts, e.g. uptime.sh

source .buildkite/scripts/common/util.sh

if [[ "${BUILDKITE_PARALLEL_JOB:-}" == 0 ]]; then
  export CYPRESS_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184718as7hd89a7dhas98d6.cloudfunctions.net/kibana-ci-proxy-cache/cypress"
fi

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

is_test_execution_step
