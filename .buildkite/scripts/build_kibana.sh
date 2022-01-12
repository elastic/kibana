#!/usr/bin/env bash

set -euo pipefail

export KBN_NP_PLUGINS_BUILT=true

echo "--- Build Kibana Distribution"
if [[ "${GITHUB_PR_LABELS:-}" == *"ci:build-all-platforms"* ]]; then
  node scripts/build --all-platforms --skip-os-packages
elif [[ "${GITHUB_PR_LABELS:-}" == *"ci:build-os-packages"* ]]; then
  node scripts/build --all-platforms
else
  node scripts/build
fi

if [[ "${GITHUB_PR_LABELS:-}" == *"ci:deploy-cloud"* ]]; then
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
fi

echo "--- Archive Kibana Distribution"
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$KIBANA_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1
mkdir -p "$KIBANA_BUILD_LOCATION"
cp -pR install/kibana/. "$KIBANA_BUILD_LOCATION/"
