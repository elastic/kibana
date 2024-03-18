#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Setup environment vars'
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_node.sh

BUILDKITE_TOKEN="$(vault_get buildkite-ci buildkite_token_all_jobs)"
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

  CI_STATS_TOKEN="$(vault_get kibana_ci_stats api_token)"
  export CI_STATS_TOKEN

  CI_STATS_HOST="$(vault_get kibana_ci_stats api_host)"
  export CI_STATS_HOST

  if [[ "$CI_STATS_BUILD_ID" ]]; then
    echo "CI Stats Build ID: $CI_STATS_BUILD_ID"

    KIBANA_CI_STATS_CONFIG=$(jq -n \
      --arg buildId "$CI_STATS_BUILD_ID" \
      --arg apiUrl "https://$CI_STATS_HOST" \
      --arg apiToken "$CI_STATS_TOKEN" \
      '{buildId: $buildId, apiUrl: $apiUrl, apiToken: $apiToken}' \
    )
    export KIBANA_CI_STATS_CONFIG
  fi
}

GITHUB_TOKEN=$(vault_get kibanamachine github_token)
export GITHUB_TOKEN

KIBANA_CI_GITHUB_TOKEN=$(vault_get kibana-ci-github github_token)
export KIBANA_CI_GITHUB_TOKEN

KIBANA_CI_REPORTER_KEY=$(vault_get kibanamachine-reporter value)
export KIBANA_CI_REPORTER_KEY

KIBANA_DOCKER_USERNAME="$(vault_get container-registry username)"
export KIBANA_DOCKER_USERNAME

KIBANA_DOCKER_PASSWORD="$(vault_get container-registry password)"
export KIBANA_DOCKER_PASSWORD

EC_API_KEY="$(vault_get kibana-ci-cloud-deploy pr_deploy_api_key)"
export EC_API_KEY

PROJECT_API_KEY="$(vault_get kibana-ci-project-deploy pr_deploy_api_key)"
export PROJECT_API_KEY

PROJECT_API_DOMAIN="$(vault_get kibana-ci-project-deploy pr_deploy_domain)"
export PROJECT_API_DOMAIN

SYNTHETICS_SERVICE_USERNAME="$(vault_get kibana-ci-synthetics-credentials username)"
export SYNTHETICS_SERVICE_USERNAME

SYNTHETICS_SERVICE_PASSWORD="$(vault_get kibana-ci-synthetics-credentials password)"
export SYNTHETICS_SERVICE_PASSWORD

SYNTHETICS_SERVICE_MANIFEST="$(vault_get kibana-ci-synthetics-credentials manifest)"
export SYNTHETICS_SERVICE_MANIFEST

SYNTHETICS_REMOTE_KIBANA_USERNAME="$(vault_get kibana-ci-synthetics-remote-credentials username)"
export SYNTHETICS_REMOTE_KIBANA_USERNAME

SYNTHETICS_REMOTE_KIBANA_PASSWORD="$(vault_get kibana-ci-synthetics-remote-credentials password)"
export SYNTHETICS_REMOTE_KIBANA_PASSWORD

SYNTHETICS_REMOTE_KIBANA_URL=${SYNTHETICS_REMOTE_KIBANA_URL-"$(vault_get kibana-ci-synthetics-remote-credentials url)"}
export SYNTHETICS_REMOTE_KIBANA_URL

DEPLOY_TAGGER_SLACK_WEBHOOK_URL=${DEPLOY_TAGGER_SLACK_WEBHOOK_URL:-"$(vault_get kibana-serverless-release-tools DEPLOY_TAGGER_SLACK_WEBHOOK_URL)"}
export DEPLOY_TAGGER_SLACK_WEBHOOK_URL

GCS_SA_CDN_QA_KEY="$(vault_get gcs-sa-cdn-qa key)"
export GCS_SA_CDN_QA_KEY

GCS_SA_CDN_QA_EMAIL="$(vault_get gcs-sa-cdn-qa email)"
export GCS_SA_CDN_QA_EMAIL

GCS_SA_CDN_QA_BUCKET="$(vault_get gcs-sa-cdn-qa bucket)"
export GCS_SA_CDN_QA_BUCKET

# Setup Failed Test Reporter Elasticsearch credentials
{
  TEST_FAILURES_ES_CLOUD_ID=$(vault_get failed_tests_reporter_es cloud_id)
  export TEST_FAILURES_ES_CLOUD_ID

  TEST_FAILURES_ES_USERNAME=$(vault_get failed_tests_reporter_es username)
  export TEST_FAILURES_ES_USERNAME

  TEST_FAILURES_ES_PASSWORD=$(vault_get failed_tests_reporter_es password)
  export TEST_FAILURES_ES_PASSWORD
}

BAZEL_LOCAL_DEV_CACHE_CREDENTIALS_FILE="$HOME/.kibana-ci-bazel-remote-cache-local-dev.json"
export BAZEL_LOCAL_DEV_CACHE_CREDENTIALS_FILE
vault_get kibana-ci-bazel-remote-cache-local-dev service_account_json > "$BAZEL_LOCAL_DEV_CACHE_CREDENTIALS_FILE"

# Export key for accessing bazel remote cache's GCS bucket
BAZEL_REMOTE_CACHE_CREDENTIALS_FILE="$HOME/.kibana-ci-bazel-remote-cache-gcs.json"
export BAZEL_REMOTE_CACHE_CREDENTIALS_FILE
vault_get kibana-ci-bazel-remote-cache-sa-key key | base64 -d > "$BAZEL_REMOTE_CACHE_CREDENTIALS_FILE"

# Setup GCS Service Account Proxy for CI
KIBANA_SERVICE_ACCOUNT_PROXY_KEY="$(mktemp -d)/kibana-gcloud-service-account.json"
export KIBANA_SERVICE_ACCOUNT_PROXY_KEY
vault_get kibana-ci-sa-proxy-key key | base64 -d > "$KIBANA_SERVICE_ACCOUNT_PROXY_KEY"

PIPELINE_PRE_COMMAND=${PIPELINE_PRE_COMMAND:-".buildkite/scripts/lifecycle/pipelines/$BUILDKITE_PIPELINE_SLUG/pre_command.sh"}
if [[ -f "$PIPELINE_PRE_COMMAND" ]]; then
  source "$PIPELINE_PRE_COMMAND"
fi
