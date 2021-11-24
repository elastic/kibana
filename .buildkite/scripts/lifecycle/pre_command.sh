#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

BUILDKITE_TOKEN="$(retry 5 5 vault read -field=buildkite_token_all_jobs secret/kibana-issues/dev/buildkite-ci)"
export BUILDKITE_TOKEN

echo '--- Install buildkite dependencies'
cd '.buildkite'
retry 5 15 yarn install --production --pure-lockfile
cd -

node .buildkite/scripts/lifecycle/print_agent_links.js || true

echo '--- Job Environment Setup'

# Set up a custom ES Snapshot Manifest if one has been specified for this build
{
  ES_SNAPSHOT_MANIFEST=${ES_SNAPSHOT_MANIFEST:-$(buildkite-agent meta-data get ES_SNAPSHOT_MANIFEST --default '')}
  export ES_SNAPSHOT_MANIFEST

  if [[ "${ES_SNAPSHOT_MANIFEST:-}" ]]; then
  cat << EOF | buildkite-agent annotate --style "info" --context es-snapshot-manifest
  This build is running using a custom Elasticsearch snapshot.

  ES Snapshot Manifest: $ES_SNAPSHOT_MANIFEST

  To use this locally, simply prefix your commands with:

  \`\`\`
  ES_SNAPSHOT_MANIFEST="$ES_SNAPSHOT_MANIFEST"
  \`\`\`

  e.g.

  \`\`\`
  ES_SNAPSHOT_MANIFEST="$ES_SNAPSHOT_MANIFEST" node scripts/functional_tests_server.js
  \`\`\`
EOF
  fi
}

# Setup CI Stats
{
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
}

GITHUB_TOKEN=$(retry 5 5 vault read -field=github_token secret/kibana-issues/dev/kibanamachine)
export GITHUB_TOKEN

KIBANA_CI_REPORTER_KEY=$(retry 5 5 vault read -field=value secret/kibana-issues/dev/kibanamachine-reporter)
export KIBANA_CI_REPORTER_KEY

# Setup Failed Test Reporter Elasticsearch credentials
{
  TEST_FAILURES_ES_CLOUD_ID=$(retry 5 5 vault read -field=cloud_id secret/kibana-issues/dev/failed_tests_reporter_es)
  export TEST_FAILURES_ES_CLOUD_ID

  TEST_FAILURES_ES_USERNAME=$(retry 5 5 vault read -field=username secret/kibana-issues/dev/failed_tests_reporter_es)
  export TEST_FAILURES_ES_USERNAME

  TEST_FAILURES_ES_PASSWORD=$(retry 5 5 vault read -field=password secret/kibana-issues/dev/failed_tests_reporter_es)
  export TEST_FAILURES_ES_PASSWORD
}

# By default, all steps should set up these things to get a full environment before running
# It can be skipped for pipeline upload steps though, to make job start time a little faster
if [[ "${SKIP_CI_SETUP:-}" != "true" ]]; then
  if [[ -d .buildkite/scripts && "${BUILDKITE_COMMAND:-}" != "buildkite-agent pipeline upload"* ]]; then
    source .buildkite/scripts/common/env.sh
    source .buildkite/scripts/common/setup_node.sh
  fi
fi

PIPELINE_PRE_COMMAND=${PIPELINE_PRE_COMMAND:-".buildkite/scripts/lifecycle/pipelines/$BUILDKITE_PIPELINE_SLUG/pre_command.sh"}
if [[ -f "$PIPELINE_PRE_COMMAND" ]]; then
  source "$PIPELINE_PRE_COMMAND"
fi
