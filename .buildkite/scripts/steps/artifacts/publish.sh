#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/artifacts/env.sh

print_if_dry_run

echo "--- Download and verify artifacts"
function download {
  download_artifact "$1" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  download_artifact "$1.sha512.txt" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  sha512sum -c "$1.sha512.txt"
  rm "$1.sha512.txt"
}

mkdir -p target
cd target

download "kibana-$FULL_VERSION-docker-image.tar.gz"
download "kibana-$FULL_VERSION-docker-image-aarch64.tar.gz"
download "kibana-cloud-$FULL_VERSION-docker-image.tar.gz"
download "kibana-cloud-$FULL_VERSION-docker-image-aarch64.tar.gz"
download "kibana-ubi-$FULL_VERSION-docker-image.tar.gz"
download "kibana-wolfi-$FULL_VERSION-docker-image.tar.gz"
download "kibana-wolfi-$FULL_VERSION-docker-image-aarch64.tar.gz"

download "kibana-$FULL_VERSION-arm64.deb"
download "kibana-$FULL_VERSION-amd64.deb"
download "kibana-$FULL_VERSION-x86_64.rpm"
download "kibana-$FULL_VERSION-aarch64.rpm"

download "kibana-$FULL_VERSION-docker-build-context.tar.gz"
download "kibana-cloud-$FULL_VERSION-docker-build-context.tar.gz"
download "kibana-ironbank-$FULL_VERSION-docker-build-context.tar.gz"
download "kibana-ubi-$FULL_VERSION-docker-build-context.tar.gz"
download "kibana-wolfi-$FULL_VERSION-docker-build-context.tar.gz"

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

echo "--- Pull latest Release Manager CLI"
docker pull docker.elastic.co/infra/release-manager:latest

echo "--- Publish artifacts"
if [[ "$BUILDKITE_BRANCH" == "$KIBANA_BASE_BRANCH" ]] || [[ "${DRY_RUN:-}" =~ ^(1|true)$ ]]; then
  export VAULT_ROLE_ID="$(get_vault_role_id)"
  export VAULT_SECRET_ID="$(get_vault_secret_id)"
  export VAULT_ADDR="https://secrets.elastic.co:8200"

  download_artifact beats_manifest.json /tmp --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  export BEATS_MANIFEST_URL=$(jq -r .manifest_url /tmp/beats_manifest.json)

  if [[ "${DRY_RUN:-}" =~ ^(1|true)$ ]]; then
      docker run --rm \
        --name release-manager \
        -e VAULT_ADDR \
        -e VAULT_ROLE_ID \
        -e VAULT_SECRET_ID \
        --mount type=bind,readonly=false,src="$PWD/target",target=/artifacts/target \
        docker.elastic.co/infra/release-manager:latest \
          cli collect \
            --project kibana \
            --branch "$KIBANA_BASE_BRANCH" \
            --commit "$GIT_COMMIT" \
            --workflow "$WORKFLOW" \
            --version "$BASE_VERSION" \
            --qualifier "$VERSION_QUALIFIER" \
            --dependency "beats:$BEATS_MANIFEST_URL" \
            --artifact-set main \
            --dry-run
  else
      docker run --rm \
        --name release-manager \
        -e VAULT_ADDR \
        -e VAULT_ROLE_ID \
        -e VAULT_SECRET_ID \
        --mount type=bind,readonly=false,src="$PWD/target",target=/artifacts/target \
        docker.elastic.co/infra/release-manager:latest \
          cli collect \
            --project kibana \
            --branch "$KIBANA_BASE_BRANCH" \
            --commit "$GIT_COMMIT" \
            --workflow "$WORKFLOW" \
            --version "$BASE_VERSION" \
            --qualifier "$VERSION_QUALIFIER" \
            --dependency "beats:$BEATS_MANIFEST_URL" \
            --artifact-set main
  fi

  KIBANA_SUMMARY=$(curl -s "$KIBANA_MANIFEST_LATEST" | jq -re '.summary_url')

  cat << EOF | buildkite-agent annotate --style "info" --context artifacts-summary
  ### Artifacts Summary

  $KIBANA_SUMMARY
EOF

else
  echo "Skipping publish for untracked branch $BUILDKITE_BRANCH"
fi
