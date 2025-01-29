#!/usr/bin/env bash

set -euo pipefail

echo '--- Job Environment Setup'

if [[ "$(type -t vault_get)" != "function" ]]; then
  source .buildkite/scripts/common/vault_fns.sh
fi

source .buildkite/scripts/common/util.sh

# Set up general-purpose tokens and credentials
{
  BUILDKITE_TOKEN="$(vault_get buildkite-ci buildkite_token_all_jobs)"
  export BUILDKITE_TOKEN

  GITHUB_TOKEN=$(vault_get kibanamachine github_token)
  export GITHUB_TOKEN

  KIBANA_DOCKER_USERNAME="$(vault_get container-registry username)"
  KIBANA_DOCKER_PASSWORD="$(vault_get container-registry password)"
  function docker_login() {
      if (command -v docker && docker version) &> /dev/null; then
        echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
      fi
  }
  retry 5 15 docker_login
}

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

# Set up misc keys
{
  KIBANA_CI_REPORTER_KEY=$(vault_get kibanamachine-reporter value)
  export KIBANA_CI_REPORTER_KEY

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

  SONAR_LOGIN=$(vault_get sonarqube token)
  export SONAR_LOGIN

  ELASTIC_APM_SERVER_URL=$(vault_get project-kibana-ci-apm apm_server_url)
  export ELASTIC_APM_SERVER_URL

  ELASTIC_APM_API_KEY=$(vault_get project-kibana-ci-apm apm_server_api_key)
  export ELASTIC_APM_API_KEY
}

# Set up GenAI keys
{
  if [[ "${FTR_GEN_AI:-}" =~ ^(1|true)$ ]]; then
    echo "FTR_GEN_AI was set - exposing LLM connectors"
    export KIBANA_TESTING_AI_CONNECTORS="$(vault_get ai-infra-ci-connectors connectors-config)"
  fi
}

# Set up GCS Service Account for CDN
{
  GCS_SA_CDN_KEY="$(vault_get gcs-sa-cdn-prod key)"
  export GCS_SA_CDN_KEY

  GCS_SA_CDN_EMAIL="$(vault_get gcs-sa-cdn-prod email)"
  export GCS_SA_CDN_EMAIL

  GCS_SA_CDN_BUCKET="$(vault_get gcs-sa-cdn-prod bucket)"
  export GCS_SA_CDN_BUCKET

  GCS_SA_CDN_URL="$(vault_get gcs-sa-cdn-prod cdn)"
  export GCS_SA_CDN_URL
}

# Setup Failed Test Reporter Elasticsearch credentials
{
  TEST_FAILURES_ES_CLOUD_ID=$(vault_get failed_tests_reporter_es cloud_id)
  export TEST_FAILURES_ES_CLOUD_ID

  TEST_FAILURES_ES_USERNAME=$(vault_get failed_tests_reporter_es username)
  export TEST_FAILURES_ES_USERNAME

  TEST_FAILURES_ES_PASSWORD=$(vault_get failed_tests_reporter_es password)
  export TEST_FAILURES_ES_PASSWORD
}

# Scout reporter settings
{
  export SCOUT_REPORTER_ENABLED="${SCOUT_REPORTER_ENABLED:-false}"

  SCOUT_REPORTER_ES_URL="$(vault_get scout/reporter/cluster-credentials es-url)"
  export SCOUT_REPORTER_ES_URL

  SCOUT_REPORTER_ES_API_KEY="$(vault_get scout/reporter/cluster-credentials es-api-key)"
  export SCOUT_REPORTER_ES_API_KEY
}

# Setup Bazel Remote/Local Cache Credentials
{
  BAZEL_LOCAL_DEV_CACHE_CREDENTIALS_FILE="$HOME/.kibana-ci-bazel-remote-cache-local-dev.json"
  export BAZEL_LOCAL_DEV_CACHE_CREDENTIALS_FILE
  vault_get kibana-ci-bazel-remote-cache-local-dev service_account_json > "$BAZEL_LOCAL_DEV_CACHE_CREDENTIALS_FILE"

  BAZEL_REMOTE_CACHE_CREDENTIALS_FILE="$HOME/.kibana-ci-bazel-remote-cache-gcs.json"
  export BAZEL_REMOTE_CACHE_CREDENTIALS_FILE
  vault_get kibana-ci-bazel-remote-cache-sa-key key | base64 -d > "$BAZEL_REMOTE_CACHE_CREDENTIALS_FILE"
}

# Setup GCS Service Account Proxy for CI
{
  KIBANA_SERVICE_ACCOUNT_PROXY_KEY="$(mktemp -d)/kibana-gcloud-service-account.json"
  export KIBANA_SERVICE_ACCOUNT_PROXY_KEY
  vault_get kibana-ci-sa-proxy-key key | base64 -d > "$KIBANA_SERVICE_ACCOUNT_PROXY_KEY"
}

PIPELINE_PRE_COMMAND=${PIPELINE_PRE_COMMAND:-".buildkite/scripts/lifecycle/pipelines/$BUILDKITE_PIPELINE_SLUG/pre_command.sh"}
if [[ -f "$PIPELINE_PRE_COMMAND" ]]; then
  source "$PIPELINE_PRE_COMMAND"
fi
