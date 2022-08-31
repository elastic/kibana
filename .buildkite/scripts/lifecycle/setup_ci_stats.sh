#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

CI_STATS_BUILD_ID="$(buildkite-agent meta-data get ci_stats_build_id --default '')"
export CI_STATS_BUILD_ID

if [[ "$CI_STATS_BUILD_ID" ]]; then
  echo "CI Stats Build ID: $CI_STATS_BUILD_ID"

  CI_STATS_TOKEN="$(retry 5 5 vault read -field=api_token secret/kibana-issues/dev/kibana_ci_stats)"
  export CI_STATS_TOKEN

  CI_STATS_HOST="$(retry 5 5 vault read -field=api_host secret/kibana-issues/dev/kibana_ci_stats)"
  export CI_STATS_HOST

  KIBANA_CI_STATS_CONFIG=$(jq -n \
    --arg buildId "$CI_STATS_BUILD_ID" \
    --arg apiUrl "https://$CI_STATS_HOST" \
    --arg apiToken "$CI_STATS_TOKEN" \
    '{buildId: $buildId, apiUrl: $apiUrl, apiToken: $apiToken}' \
  )
  export KIBANA_CI_STATS_CONFIG
fi
