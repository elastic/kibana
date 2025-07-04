#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

export KBN_NP_PLUGINS_BUILT=true

VERSION="$(jq -r '.version' package.json)-SNAPSHOT"

echo "--- Download Kibana Distribution"

mkdir -p ./target
download_artifact "kibana-$VERSION-linux-x86_64.tar.gz" ./target --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Build Cloud FIPS Distribution"

node scripts/build \
  --skip-initialize \
  --skip-generic-folders \
  --skip-platform-folders \
  --skip-cdn-assets \
  --skip-archives \
  --docker-images \
  --docker-tag-qualifier="$GIT_COMMIT" \
  --docker-push \
  --skip-docker-ubi \
  --skip-docker-cloud \
  --skip-docker-fips \
  --skip-docker-wolfi \
  --skip-docker-serverless \
  --skip-docker-contexts

CLOUD_FIPS_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" docker.elastic.co/kibana-ci/kibana-cloud-fips)
cat <<EOF | buildkite-agent annotate --style "info" --context kibana-cloud-fips-image

  Kibana cloud FIPS image: \`$CLOUD_FIPS_IMAGE\`
EOF
