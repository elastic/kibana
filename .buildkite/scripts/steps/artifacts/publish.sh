#!/usr/bin/env bash

set -euo pipefail

if [[ "${RELEASE_BUILD:-}" == "true" ]]; then
  VERSION="$(jq -r '.version' package.json)"
  WORKFLOW="staging"
else
  VERSION="$(jq -r '.version' package.json)-SNAPSHOT"
  WORKFLOW="snapshot"
fi

echo "--- Download and verify artifacts"
function download {
  buildkite-agent artifact download "$1" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  buildkite-agent artifact download "$1.sha512.txt" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  sha512sum -c "$1.sha512.txt"
}

mkdir -p target
cd target

download "kibana-$VERSION-docker-image.tar.gz"
download "kibana-$VERSION-docker-image-aarch64.tar.gz"
download "kibana-ubi8-$VERSION-docker-image.tar.gz"

download "kibana-$VERSION-arm64.deb"
download "kibana-$VERSION-amd64.deb"
download "kibana-$VERSION-x86_64.rpm"
download "kibana-$VERSION-aarch64.rpm"

download "kibana-$VERSION-docker-build-context.tar.gz"
download "kibana-ironbank-$VERSION-docker-build-context.tar.gz"
download "kibana-ubi8-$VERSION-docker-build-context.tar.gz"

download "kibana-$VERSION-linux-aarch64.tar.gz"
download "kibana-$VERSION-linux-x86_64.tar.gz"

download "kibana-$VERSION-darwin-x86_64.tar.gz"
download "kibana-$VERSION-darwin-aarch64.tar.gz"

download "kibana-$VERSION-windows-x86_64.zip"

download "dependencies-$VERSION.csv"

cd - 

echo "--- Pull latest release manager"
echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
trap 'docker logout docker.elastic.co' EXIT
docker pull docker.elastic.co/infra/release-manager:latest

echo "--- Publish artifacts"
VAULT_ROLE_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-role-id)"
VAULT_SECRET_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-secret-id)"
VAULT_ADDR="https://secrets.elastic.co:8200"
QUALIFIER=""
docker run --rm \
  --name release-manager \
  -e VAULT_ADDR \
  -e VAULT_ROLE_ID \
  -e VAULT_SECRET_ID \
  --mount type=bind,readonly=false,src="$PWD/target",target=/artifacts \
  docker.elastic.co/infra/release-manager:latest \
    cli collect \
      --project kibana \
      --branch "$KIBANA_BASE_BRANCH" \
      --commit "$GIT_COMMIT" \
      --workflow "$WORKFLOW" \
      --version "$VERSION" \
      --qualifier "$QUALIFIER" \
      --artifact-set main
