#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

export KBN_NP_PLUGINS_BUILT=true

VERSION="$(jq -r '.version' package.json)-SNAPSHOT"

echo "--- Download kibana distribution"

mkdir -p ./target
buildkite-agent artifact download "kibana-$VERSION-linux-x86_64.tar.gz" ./target --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Build and push Kibana Cloud Distribution"

echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
trap 'docker logout docker.elastic.co' EXIT

node scripts/build \
  --skip-initialize \
  --skip-generic-folders \
  --skip-platform-folders \
  --skip-archives \
  --docker-images \
  --docker-tag-qualifier="$GIT_COMMIT" \
  --docker-push \
  --skip-docker-ubi \
  --skip-docker-ubuntu \
  --skip-docker-contexts

ELASTICSEARCH_MANIFEST_URL="https://storage.googleapis.com/kibana-ci-es-snapshots-daily/$(jq -r '.version' package.json)/manifest-latest-verified.json"
ELASTICSEARCH_SHA=$(curl -s $ELASTICSEARCH_MANIFEST_URL | jq -r '.sha')
ELASTICSEARCH_CLOUD_IMAGE="docker.elastic.co/kibana-ci/elasticsearch-cloud:$VERSION-$ELASTICSEARCH_SHA"

CLOUD_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" docker.elastic.co/kibana-ci/kibana-cloud)
CLOUD_DEPLOYMENT_NAME="kibana-pr-$BUILDKITE_PULL_REQUEST"

CLOUD_DEPLOYMENT_ID=$(ecctl deployment list --output json | jq -r '.deployments[] | select(.name == "'$CLOUD_DEPLOYMENT_NAME'") | .id')
JSON_FILE=$(mktemp --suffix ".json")
if [ -z "${CLOUD_DEPLOYMENT_ID}" ]; then
  jq '
    .resources.kibana[0].plan.kibana.docker_image = "'$CLOUD_IMAGE'" |
    .resources.elasticsearch[0].plan.elasticsearch.docker_image = "'$ELASTICSEARCH_CLOUD_IMAGE'" |
    .name = "'$CLOUD_DEPLOYMENT_NAME'" |
    .resources.kibana[0].plan.kibana.version = "'$VERSION'" |
    .resources.elasticsearch[0].plan.elasticsearch.version = "'$VERSION'" |
    .resources.enterprise_search[0].plan.enterprise_search.version = "'$VERSION'" |
    .resources.integrations_server[0].plan.integrations_server.version = "'$VERSION'"
    ' .buildkite/scripts/steps/cloud/deploy.json > /tmp/deploy.json

  ecctl deployment create --track --output json --file /tmp/deploy.json &> "$JSON_FILE"
  CLOUD_DEPLOYMENT_USERNAME=$(jq --slurp '.[]|select(.resources).resources[] | select(.credentials).credentials.username' "$JSON_FILE")
  CLOUD_DEPLOYMENT_PASSWORD=$(jq --slurp '.[]|select(.resources).resources[] | select(.credentials).credentials.password' "$JSON_FILE")
  CLOUD_DEPLOYMENT_ID=$(jq -r --slurp '.[0].id' "$JSON_FILE")
  CLOUD_DEPLOYMENT_STATUS_MESSAGES=$(jq --slurp '[.[]|select(.resources == null)]' "$JSON_FILE")

  # Enable stack monitoring
  jq '
    .settings.observability.metrics.destination.deployment_id = "'$CLOUD_DEPLOYMENT_ID'" |
    .settings.observability.logging.destination.deployment_id = "'$CLOUD_DEPLOYMENT_ID'"
    ' .buildkite/scripts/steps/cloud/stack_monitoring.json > /tmp/stack_monitoring.json
  ecctl deployment update "$CLOUD_DEPLOYMENT_ID" --track --output json --file /tmp/stack_monitoring.json &> "$JSON_FILE"

  # Refresh vault token
  VAULT_ROLE_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-role-id)"
  VAULT_SECRET_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-secret-id)"
  VAULT_TOKEN=$(retry 5 30 vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
  retry 5 30 vault login -no-print "$VAULT_TOKEN"

  retry 5 5 vault write "secret/kibana-issues/dev/cloud-deploy/$CLOUD_DEPLOYMENT_NAME" username="$CLOUD_DEPLOYMENT_USERNAME" password="$CLOUD_DEPLOYMENT_PASSWORD"
else
ecctl deployment show "$CLOUD_DEPLOYMENT_ID" --generate-update-payload | jq '
  .resources.kibana[0].plan.kibana.docker_image = "'$CLOUD_IMAGE'" |
  (.. | select(.version? != null).version) = "'$VERSION'"
  ' > /tmp/deploy.json
  ecctl deployment update "$CLOUD_DEPLOYMENT_ID" --track --output json --file /tmp/deploy.json &> "$JSON_FILE"
fi

CLOUD_DEPLOYMENT_KIBANA_URL=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" | jq -r '.resources.kibana[0].info.metadata.aliased_url')
CLOUD_DEPLOYMENT_ELASTICSEARCH_URL=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" | jq -r '.resources.elasticsearch[0].info.metadata.aliased_url')

cat << EOF | buildkite-agent annotate --style "info" --context cloud
  ### Cloud Deployment

  Kibana: $CLOUD_DEPLOYMENT_KIBANA_URL

  Elasticsearch: $CLOUD_DEPLOYMENT_ELASTICSEARCH_URL

  Credentials: \`vault read secret/kibana-issues/dev/cloud-deploy/$CLOUD_DEPLOYMENT_NAME\`

  Kibana image: \`$CLOUD_IMAGE\`

  Elasticsearch image: \`$ELASTICSEARCH_CLOUD_IMAGE\`
EOF

buildkite-agent meta-data set pr_comment:deploy_cloud:head "* [Cloud Deployment](${CLOUD_DEPLOYMENT_KIBANA_URL})"
