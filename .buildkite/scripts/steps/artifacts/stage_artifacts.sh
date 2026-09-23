#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/artifacts/env.sh

echo "--- Download and verify artifacts"

function download {
  download_artifact "$1" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  download_artifact "$1.sha512.txt" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  sha512sum -c "$1.sha512.txt"
  rm "$1.sha512.txt"
}

mkdir -p target
cd target

download "kibana-$FULL_VERSION-docker-image-amd64.tar.gz"
download "kibana-$FULL_VERSION-docker-image-arm64.tar.gz"
download "kibana-cloud-$FULL_VERSION-docker-image-amd64.tar.gz"
download "kibana-cloud-$FULL_VERSION-docker-image-arm64.tar.gz"
download "kibana-wolfi-$FULL_VERSION-docker-image-amd64.tar.gz"
download "kibana-wolfi-$FULL_VERSION-docker-image-arm64.tar.gz"

download "kibana-$FULL_VERSION-arm64.deb"
download "kibana-$FULL_VERSION-amd64.deb"
download "kibana-$FULL_VERSION-x86_64.rpm"
download "kibana-$FULL_VERSION-aarch64.rpm"

download "kibana-$FULL_VERSION-docker-build-context.tar.gz"
download "kibana-cloud-$FULL_VERSION-docker-build-context.tar.gz"
download "kibana-ironbank-$FULL_VERSION-docker-build-context.tar.gz"
download "kibana-wolfi-$FULL_VERSION-docker-build-context.tar.gz"

download "kibana-cloud-fips-$FULL_VERSION-docker-build-context.tar.gz"
download "kibana-cloud-fips-$FULL_VERSION-docker-image-amd64.tar.gz"
download "kibana-cloud-fips-$FULL_VERSION-docker-image-arm64.tar.gz"

download "kibana-$FULL_VERSION-linux-aarch64.tar.gz"
download "kibana-$FULL_VERSION-linux-x86_64.tar.gz"

download "kibana-$FULL_VERSION-darwin-x86_64.tar.gz"
download "kibana-$FULL_VERSION-darwin-aarch64.tar.gz"

download "kibana-$FULL_VERSION-windows-x86_64.zip"

download "dependencies-$FULL_VERSION.csv"

cd -

echo "--- Set artifact permissions"
chmod -R a+r target/*
chmod -R a+w target

echo "--- Stage artifacts for DRA"
mkdir -p artifacts
cp target/* artifacts/

echo "Staged artifacts:"
ls -1 artifacts/
