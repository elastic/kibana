#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export KBN_NP_PLUGINS_BUILT=true

echo "--- Build Kibana Distribution"

BUILD_ARGS=("--with-test-plugins" "--with-example-plugins")
is_pr_with_label "ci:build-all-platforms" && BUILD_ARGS+=("--all-platforms")
is_pr_with_label "ci:build-docker-cross-compile" && BUILD_ARGS+=("--docker-cross-compile")
is_pr_with_label "ci:build-os-packages" || BUILD_ARGS+=("--skip-os-packages")
is_pr_with_label "ci:build-canvas-shareable-runtime" || BUILD_ARGS+=("--skip-canvas-shareable-runtime")
is_pr_with_label "ci:build-docker-contexts" || BUILD_ARGS+=("--skip-docker-contexts")

echo "> node scripts/build" "${BUILD_ARGS[@]}"
node scripts/build "${BUILD_ARGS[@]}"

if is_pr_with_label "ci:build-cloud-image"; then
  echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
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
  --skip-docker-serverless \
  --skip-docker-contexts
  docker logout docker.elastic.co

  CLOUD_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" docker.elastic.co/kibana-ci/kibana-cloud)
  cat << EOF | buildkite-agent annotate --style "info" --context kibana-cloud-image

  Kibana cloud image: \`$CLOUD_IMAGE\`
EOF
fi

echo "--- Archive Kibana Distribution"
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$KIBANA_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1
mkdir -p "$KIBANA_BUILD_LOCATION"
cp -pR install/kibana/. "$KIBANA_BUILD_LOCATION/"
