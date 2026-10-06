#!/usr/bin/env bash

set -euo pipefail

CI_STATS_BUILD_ID="$(buildkite-agent meta-data get ci_stats_build_id --default '')"
export CI_STATS_BUILD_ID

if [[ "${BUILDKITE_PIPELINE_SLUG:-}" == "kibana-pull-request" ]]; then
  CI_STATS_AUTH_TYPE=buildkite_oidc
  ci_stats_broker_url="${ACCESS_BROKER_URL:-https://access-broker.kibana.dev}"
  CI_STATS_API_URL="${ci_stats_broker_url%/}/proxy/kibana.ci_stats"
  unset CI_STATS_TOKEN CI_STATS_HOST
else
  CI_STATS_AUTH_TYPE=token
  CI_STATS_TOKEN="$(vault_get kibana_ci_stats api_token)"
  CI_STATS_HOST="$(vault_get kibana_ci_stats api_host)"
  CI_STATS_API_URL="https://$CI_STATS_HOST"
  export CI_STATS_TOKEN CI_STATS_HOST
fi
export CI_STATS_AUTH_TYPE CI_STATS_API_URL

unset KIBANA_CI_STATS_CONFIG
if [[ "$CI_STATS_BUILD_ID" ]]; then
  echo "CI Stats Build ID: $CI_STATS_BUILD_ID"

  KIBANA_CI_STATS_CONFIG=$(jq -n \
    --arg buildId "$CI_STATS_BUILD_ID" \
    --arg apiUrl "$CI_STATS_API_URL" \
    --arg authType "$CI_STATS_AUTH_TYPE" \
    --arg apiToken "${CI_STATS_TOKEN:-}" \
    '{buildId: $buildId, apiUrl: $apiUrl, authType: $authType} +
      (if $authType == "token" then {apiToken: $apiToken} else {} end)' \
  )
  export KIBANA_CI_STATS_CONFIG
fi
