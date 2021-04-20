#!/usr/bin/env bash

set -euo pipefail

"$(dirname "${0}")/commit_status_start.sh"

export CI_STATS_TOKEN="$(vault read -field=api_token secret/kibana-issues/dev/kibana_ci_stats)"
export CI_STATS_HOST="$(vault read -field=api_host secret/kibana-issues/dev/kibana_ci_stats)"

node "$(dirname "${0}")/setup_ci_stats.js"
