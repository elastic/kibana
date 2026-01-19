#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

export KBN_NP_PLUGINS_BUILT=true

# VERSION for downloading the artifact (must match what build_kibana.sh created)
VERSION="$(jq -r '.version' package.json)"

# Custom docker tag without SNAPSHOT (to enable APM in Cloud)
DOCKER_TAG="$(jq -r '.version' package.json)-$GIT_COMMIT"

echo "--- Download Kibana Distribution"

mkdir -p ./target
download_artifact "kibana-$VERSION-linux-x86_64.tar.gz" ./target --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Build Cloud Distribution"

node scripts/build \
  --skip-initialize \
  --skip-generic-folders \
  --skip-platform-folders \
  --skip-cdn-assets \
  --skip-archives \
  --docker-images \
  --docker-tag="$DOCKER_TAG" \
  --docker-push \
  --skip-docker-ubi \
  --skip-docker-cloud-fips \
  --skip-docker-fips \
  --skip-docker-wolfi \
  --skip-docker-serverless \
  --skip-docker-contexts

CLOUD_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" docker.elastic.co/kibana-ci/kibana-cloud)
cat <<EOF | buildkite-agent annotate --style "info" --context kibana-cloud-image

  Kibana cloud image: \`$CLOUD_IMAGE\`
EOF
