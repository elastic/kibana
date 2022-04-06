#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

if [[ "${RELEASE_BUILD:-}" == "true" ]]; then
  VERSION="$(jq -r '.version' package.json)"
  RELEASE_ARG="--release"
else
  VERSION="$(jq -r '.version' package.json)-SNAPSHOT"
  RELEASE_ARG=""
fi

echo "--- Publish Cloud image"
mkdir -p target
cd target

buildkite-agent artifact download "kibana-cloud-$VERSION-docker-image.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
docker load --input kibana-cloud-$VERSION-docker-image.tar.gz

TAG="$VERSION-$GIT_COMMIT"
KIBANA_BASE_IMAGE="docker.elastic.co/kibana/kibana-cloud:$VERSION"
KIBANA_TEST_IMAGE="docker.elastic.co/kibana-ci/kibana-cloud:$TAG"

docker tag "$KIBANA_BASE_IMAGE" "KIBANA_TEST_IMAGE"

echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
trap 'docker logout docker.elastic.co' EXIT

docker push "KIBANA_TEST_IMAGE"
docker logout docker.elastic.co

cd -

echo "--- Create deployment"
CLOUD_DEPLOYMENT_NAME="kibana-release-$TAG"

LOGS=$(mktemp --suffix ".json")
DEPLOYMENT_SPEC=$(mktemp --suffix ".json")

jq '
  .name = "'$CLOUD_DEPLOYMENT_NAME'" |
  .resources.kibana[0].plan.kibana.docker_image = "'$KIBANA_TEST_IMAGE'" |
  .resources.elasticsearch[0].plan.elasticsearch.docker_image = "'$VERSION'" |
  .resources.kibana[0].plan.kibana.version = "'$VERSION'" |
  .resources.elasticsearch[0].plan.elasticsearch.version = "'$VERSION'" |
  .resources.enterprise_search[0].plan.enterprise_search.version = "'$VERSION'" |
  .resources.integrations_server[0].plan.integrations_server.version = "'$VERSION'"
  ' .buildkite/scripts/steps/cloud/deploy.json > "$DEPLOYMENT_SPEC"

ecctl deployment create --track --output json --file "$DEPLOYMENT_SPEC" &> "$LOGS"

CLOUD_DEPLOYMENT_USERNAME=$(jq --slurp '.[]|select(.resources).resources[] | select(.credentials).credentials.username' "$LOGS")
CLOUD_DEPLOYMENT_PASSWORD=$(jq --slurp '.[]|select(.resources).resources[] | select(.credentials).credentials.password' "$LOGS")
CLOUD_DEPLOYMENT_ID=$(jq -r --slurp '.[0].id' "$LOGS")
CLOUD_DEPLOYMENT_STATUS_MESSAGES=$(jq --slurp '[.[]|select(.resources == null)]' "$LOGS")

CLOUD_DEPLOYMENT_KIBANA_URL=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" | jq -r '.resources.kibana[0].info.metadata.aliased_url')
CLOUD_DEPLOYMENT_ELASTICSEARCH_URL=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" | jq -r '.resources.elasticsearch[0].info.metadata.aliased_url')

echo "--- Run functional tests"
# TODO
# TEST_KIBANA_PROTOCOL=https
# TEST_KIBANA_HOSTNAME=my-kibana-instance.internal.net
# TEST_KIBANA_PORT=443
# TEST_KIBANA_USER=kibana
# TEST_KIBANA_PASS=<password>

# TEST_ES_PROTOCOL=https
# TEST_ES_HOSTNAME=my-es-cluster.internal.net
# TEST_ES_PORT=9200
# TEST_ES_USER="$CLOUD_DEPLOYMENT_USERNAME"
# TEST_ES_PASS="$CLOUD_DEPLOYMENT_PASSWORD"

echo "--- Shutdown deployment"
ecctl deployment shutdown --force --track --output json &> "$LOGS"
