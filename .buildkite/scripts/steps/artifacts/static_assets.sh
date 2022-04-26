#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/artifacts/env.sh

echo "--- Download"
STATIC_ASSETS="kibana-$FULL_VERSION-cdn-assets.tar.gz"
buildkite-agent artifact download "$STATIC_ASSETS" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
buildkite-agent artifact download "$STATIC_ASSETS.sha512.txt" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
sha512sum -c "$1.sha512.txt"

echo "--- Unpack"
STATIC_ASSETS_FOLDER=$(mktemp -d)
tar -xzf "$STATIC_ASSETS" -C "$STATIC_ASSETS_FOLDER" --strip=1
cd "$STATIC_ASSETS_FOLDER"

echo "--- Publish"
gsutil -m cp -r . gs://kibana-staging-static-assets/$BUILDKITE_COMMIT
