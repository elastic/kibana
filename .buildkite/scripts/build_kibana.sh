#!/usr/bin/env bash

set -euo pipefail

export KBN_NP_PLUGINS_BUILT=true

echo "--- Build Kibana Distribution"
if [[ "${GITHUB_PR_LABELS:-}" == *"ci:build-all-platforms"* ]]; then
  node scripts/build --all-platforms --skip-os-packages
else
  node scripts/build
fi

if [[ "${GITHUB_PR_LABELS:-}" == *"ci:deploy-cloud"* ]]; then
  echo "--- Build and push Kibana Cloud Distribution"

  DOCKER_USERNAME="$(vault read -field=username secret/kibana-issues/dev/container-registry)"
  DOCKER_PASSWORD="$(vault read -field=password secret/kibana-issues/dev/container-registry)"
  echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin docker.elastic.co
  trap 'docker logout docker.elastic.co' EXIT
  unset DOCKER_USERNAME
  unset DOCKER_PASSWORD

  node scripts/build \
    --skip-initialize \
    --skip-generic-folders \
    --skip-platform-folders \
    --skip-archives \
    --docker-images \
    --docker-tag-qualifier="-$GIT_COMMIT" \
    --docker-push \
    --skip-docker-ubi \
    --skip-docker-centos \
    --skip-docker-contexts
fi

echo "--- Archive Kibana Distribution"
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$KIBANA_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1
mkdir -p "$KIBANA_BUILD_LOCATION"
cp -pR install/kibana/. "$KIBANA_BUILD_LOCATION/"
