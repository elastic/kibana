#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Clean up cached images to free up space"
clean_cached_images

export KBN_NP_PLUGINS_BUILT=true

echo "--- Build Kibana Distribution"

BUILD_ARGS=("--with-test-plugins" "--with-example-plugins" "--no-debug" "--tar-zstd")
is_pr_with_label "ci:build-all-platforms" && BUILD_ARGS+=("--all-platforms")
is_pr_with_label "ci:build-docker-cross-compile" && BUILD_ARGS+=("--docker-cross-compile")
is_pr_with_label "ci:build-os-packages" || BUILD_ARGS+=("--skip-os-packages")
is_pr_with_label "ci:build-docker-contexts" || BUILD_ARGS+=("--skip-docker-contexts")
is_pr_with_label "ci:build-cdn-assets" || BUILD_ARGS+=("--skip-cdn-assets")

echo "> node scripts/build" "${BUILD_ARGS[@]}"
node scripts/build "${BUILD_ARGS[@]}"

echo "--- Archive Kibana Distribution"
version="$(jq -r '.version' package.json)"
linuxBuild="$KIBANA_DIR/target/kibana-$version-SNAPSHOT-linux-x86_64.tar.zst"
installDir="$KIBANA_DIR/install/kibana"
mkdir -p "$installDir"
tar -xf "$linuxBuild" -I zstd -C "$installDir" --strip=1
mkdir -p "$KIBANA_BUILD_LOCATION"
cp -pR install/kibana/. "$KIBANA_BUILD_LOCATION/"
