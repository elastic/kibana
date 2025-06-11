#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Pick Test Group Run Order'
ts-node "$(dirname "${0}")/generate_dummy_tasks.ts"
