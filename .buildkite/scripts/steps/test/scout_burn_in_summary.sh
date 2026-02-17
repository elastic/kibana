#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Posting Scout Burn-in Summary'
ts-node "$(dirname "${0}")/scout_burn_in_summary.ts"
