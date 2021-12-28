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

jq '
  .resources.kibana[0].plan.kibana.docker_image = "'$CLOUD_IMAGE'" |
  .name = "pr-'$BUILDKITE_PULL_REQUEST'-'$GIT_COMMIT'" |
  .resources.kibana[0].plan.kibana.version = "'$VERSION'" |
  .resources.elasticsearch[0].plan.kibana.version = "'$VERSION'"
  ' .buildkite/scripts/steps/cloud/deploy.json > /tmp/deploy.json

DEPLOYMENT=$(ecctl deployment create --file /tmp/deploy.json)

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
