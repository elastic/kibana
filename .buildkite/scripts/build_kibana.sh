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
is_pr_with_label "ci:build-cdn-assets" || BUILD_ARGS+=("--skip-cdn-assets")

echo "> node scripts/build" "${BUILD_ARGS[@]}"
node scripts/build "${BUILD_ARGS[@]}"

if is_pr_with_label "ci:build-cloud-image"; then
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
  --skip-docker-fips \
  --skip-docker-ubuntu \
  --skip-docker-wolfi \
  --skip-docker-serverless \
  --skip-docker-contexts

  CLOUD_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" docker.elastic.co/kibana-ci/kibana-cloud)
  cat << EOF | buildkite-agent annotate --style "info" --context kibana-cloud-image

  Kibana cloud image: \`$CLOUD_IMAGE\`
EOF
fi
