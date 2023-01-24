#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Setup environment vars'
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_node.sh

BUILDKITE_TOKEN="$(retry 5 5 vault read -field=buildkite_token_all_jobs secret/kibana-issues/dev/buildkite-ci)"
export BUILDKITE_TOKEN

echo '--- Install/build buildkite dependencies'

# `rm -rf <ts-node node_modules dir>; npm install -g ts-node` will cause ts-node bin files to be messed up
# but literally just calling `npm install -g ts-node` a second time fixes it
# this is only on newer versions of npm
npm_install_global ts-node
if ! ts-node --version; then
  npm_install_global ts-node
  ts-node --version;
fi

cd '.buildkite'
retry 5 15 npm ci
cd ..

echo '--- Agent Debug/SSH Info'
ts-node .buildkite/scripts/lifecycle/print_agent_links.ts || true

if [[ "$(curl -is metadata.google.internal || true)" ]]; then
  echo ""
  echo "To SSH into this agent, run:"
  echo "gcloud compute ssh --tunnel-through-iap --project elastic-kibana-ci --zone \"$(curl -sH Metadata-Flavor:Google http://metadata.google.internal/computeMetadata/v1/instance/zone)\" \"$(curl -sH Metadata-Flavor:Google http://metadata.google.internal/computeMetadata/v1/instance/name)\""
  echo ""
fi

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

# If a custom manifest isn't specified, then use the default one that we resolve earlier in the build
{
  if [[ ! "${ES_SNAPSHOT_MANIFEST:-}" ]]; then
    ES_SNAPSHOT_MANIFEST=${ES_SNAPSHOT_MANIFEST:-$(buildkite-agent meta-data get ES_SNAPSHOT_MANIFEST_DEFAULT --default '')}
    export ES_SNAPSHOT_MANIFEST
    echo "Using default ES Snapshot Manifest: $ES_SNAPSHOT_MANIFEST"
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

KIBANA_CI_GITHUB_TOKEN=$(retry 5 5 vault read -field=github_token secret/kibana-issues/dev/kibana-ci-github)
export KIBANA_CI_GITHUB_TOKEN

KIBANA_CI_REPORTER_KEY=$(retry 5 5 vault read -field=value secret/kibana-issues/dev/kibanamachine-reporter)
export KIBANA_CI_REPORTER_KEY

KIBANA_DOCKER_USERNAME="$(retry 5 5 vault read -field=username secret/kibana-issues/dev/container-registry)"
export KIBANA_DOCKER_USERNAME

KIBANA_DOCKER_PASSWORD="$(retry 5 5 vault read -field=password secret/kibana-issues/dev/container-registry)"
export KIBANA_DOCKER_PASSWORD

EC_API_KEY="$(retry 5 5 vault read -field=pr_deploy_api_key secret/kibana-issues/dev/kibana-ci-cloud-deploy)"
export EC_API_KEY

SYNTHETICS_SERVICE_USERNAME="$(retry 5 5 vault read -field=username secret/kibana-issues/dev/kibana-ci-synthetics-credentials)"
export SYNTHETICS_SERVICE_USERNAME

SYNTHETICS_SERVICE_PASSWORD="$(retry 5 5 vault read -field=password secret/kibana-issues/dev/kibana-ci-synthetics-credentials)"
export SYNTHETICS_SERVICE_PASSWORD

SYNTHETICS_SERVICE_MANIFEST="$(retry 5 5 vault read -field=manifest secret/kibana-issues/dev/kibana-ci-synthetics-credentials)"
export SYNTHETICS_SERVICE_MANIFEST

SYNTHETICS_REMOTE_KIBANA_USERNAME="$(retry 5 5 vault read -field=username secret/kibana-issues/dev/kibana-ci-synthetics-remote-credentials)"
export SYNTHETICS_REMOTE_KIBANA_USERNAME

SYNTHETICS_REMOTE_KIBANA_PASSWORD="$(retry 5 5 vault read -field=password secret/kibana-issues/dev/kibana-ci-synthetics-remote-credentials)"
export SYNTHETICS_REMOTE_KIBANA_PASSWORD

SYNTHETICS_REMOTE_KIBANA_URL=${SYNTHETICS_REMOTE_KIBANA_URL-"$(retry 5 5 vault read -field=url secret/kibana-issues/dev/kibana-ci-synthetics-remote-credentials)"}
export SYNTHETICS_REMOTE_KIBANA_URL

# Setup Failed Test Reporter Elasticsearch credentials
{
  TEST_FAILURES_ES_CLOUD_ID=$(retry 5 5 vault read -field=cloud_id secret/kibana-issues/dev/failed_tests_reporter_es)
  export TEST_FAILURES_ES_CLOUD_ID

  TEST_FAILURES_ES_USERNAME=$(retry 5 5 vault read -field=username secret/kibana-issues/dev/failed_tests_reporter_es)
  export TEST_FAILURES_ES_USERNAME

  TEST_FAILURES_ES_PASSWORD=$(retry 5 5 vault read -field=password secret/kibana-issues/dev/failed_tests_reporter_es)
  export TEST_FAILURES_ES_PASSWORD
}

BAZEL_LOCAL_DEV_CACHE_CREDENTIALS_FILE="$HOME/.kibana-ci-bazel-remote-cache-local-dev.json"
export BAZEL_LOCAL_DEV_CACHE_CREDENTIALS_FILE
retry 5 5 vault read -field=service_account_json secret/kibana-issues/dev/kibana-ci-bazel-remote-cache-local-dev > "$BAZEL_LOCAL_DEV_CACHE_CREDENTIALS_FILE"

PIPELINE_PRE_COMMAND=${PIPELINE_PRE_COMMAND:-".buildkite/scripts/lifecycle/pipelines/$BUILDKITE_PIPELINE_SLUG/pre_command.sh"}
if [[ -f "$PIPELINE_PRE_COMMAND" ]]; then
  source "$PIPELINE_PRE_COMMAND"
fi
