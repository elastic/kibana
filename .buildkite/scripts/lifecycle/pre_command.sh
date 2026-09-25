#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_job_env.sh
source .buildkite/scripts/common/setup_executors.sh

source .buildkite/scripts/common/disk_usage.sh
print_disk_usage "pre-command"

if [[ "${SKIP_NODE_SETUP:-}" =~ ^(1|true)$ ]]; then
  echo "Skipping node setup (SKIP_NODE_SETUP=$SKIP_NODE_SETUP)"
else
  source .buildkite/scripts/common/setup_node.sh
  source .buildkite/scripts/common/setup_buildkite_deps.sh
fi
