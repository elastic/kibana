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

CLOUD_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" docker.elastic.co/kibana-ci/kibana-cloud)
cat << EOF | buildkite-agent annotate --style "info" --context cloud-image
  Cloud image: $CLOUD_IMAGE
EOF

CLOUD_DEPLOYMENT_NAME="kibana-pr-$BUILDKITE_PULL_REQUEST"

jq '
  .resources.kibana[0].plan.kibana.docker_image = "'$CLOUD_IMAGE'" |
  .name = "'$CLOUD_DEPLOYMENT_NAME'" |
  .resources.kibana[0].plan.kibana.version = "'$VERSION'" |
  .resources.elasticsearch[0].plan.elasticsearch.version = "'$VERSION'"
  ' .buildkite/scripts/steps/cloud/deploy.json > /tmp/deploy.json

CLOUD_DEPLOYMENT_ID=$(ecctl deployment list --output json | jq -r '.deployments[] | select(.name == "'$CLOUD_DEPLOYMENT_NAME'") | .id')
if [ -z "${CLOUD_DEPLOYMENT_ID}" ];
  ecctl deployment create --track --output json --file /tmp/deploy.json > target/cloud-create-deployment.json
  CLOUD_DEPLOYMENT_USERNAME=$(jq --slurp '.[]|select(.resources).resources[] | select(.credentials).credentials.username' target/cloud-create-deployment.json)
  CLOUD_DEPLOYMENT_PASSWORD=$(jq --slurp '.[]|select(.resources).resources[] | select(.credentials).credentials.password' target/cloud-create-deployment.json)
  CLOUD_DEPLOYMENT_STATUS_MESSAGES=$(jq --slurp '[.[]|select(.resources == null)]' target/cloud-create-deployment.json)

  echo "Username: $CLOUD_DEPLOYMENT_USERNAME"
  echo ""
  echo "$CLOUD_DEPLOYMENT_STATUS_MESSAGES"
else
  ecctl deployment update $CLOUD_DEPLOYMENT_ID --track --output json --file /tmp/deploy.json > target/cloud-update-deployment.json
fi

# TODO update the annotation to add the deployment details
# cat << EOF | buildkite-agent annotate --style "info" --context cloud-image
#   Cloud image: $CLOUD_IMAGE
# EOF

# TODO add PR comment header bullet
# buildkite-agent meta-data set pr_comment:deploy_cloud:head "* [Cloud Deployment](${URL_HERE})"

# TODO or add PR comment body section if more info than URL
# cat << EOF | buildkite-agent meta-data set pr_comment:deploy_cloud:body
# ### Cloud Deployment

# yadda yadda
# EOF
