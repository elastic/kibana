#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

exit 1

"$(dirname "${0}")/commit_status_start.sh"

export CI_STATS_TOKEN="$(retry 5 5 vault read -field=api_token secret/kibana-issues/dev/kibana_ci_stats)"
export CI_STATS_HOST="$(retry 5 5 vault read -field=api_host secret/kibana-issues/dev/kibana_ci_stats)"

node "$(dirname "${0}")/ci_stats_start.js"
