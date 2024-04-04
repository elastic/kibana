#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/steps/artifacts/env.sh

GIT_ABBREV_COMMIT=${BUILDKITE_COMMIT:0:12}
if [[ "${BUILDKITE_PULL_REQUEST:-false}" == "false" ]]; then
  KIBANA_IMAGE_TAG="git-$GIT_ABBREV_COMMIT"
else
  KIBANA_IMAGE_TAG="pr-$BUILDKITE_PULL_REQUEST-$GIT_ABBREV_COMMIT"
fi

KIBANA_BASE_IMAGE="docker.elastic.co/kibana-ci/kibana-serverless"
export KIBANA_IMAGE="$KIBANA_BASE_IMAGE:$KIBANA_IMAGE_TAG"

echo "--- Verify manifest does not already exist"
echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
trap 'docker logout docker.elastic.co' EXIT

echo "Checking manifest for $KIBANA_IMAGE"
if docker manifest inspect $KIBANA_IMAGE &> /dev/null; then
  echo "Manifest already exists, exiting"
  exit 1
fi

echo "--- Build Kibana"
node scripts/build \
  --debug \
  --release \
  --docker-cross-compile \
  --docker-images \
  --docker-namespace="kibana-ci" \
  --docker-tag="$KIBANA_IMAGE_TAG" \
  --skip-docker-ubuntu \
  --skip-docker-ubi \
  --skip-docker-fips \
  --skip-docker-cloud \
  --skip-docker-contexts

echo "--- Tag images"
docker rmi "$KIBANA_IMAGE"
docker load < "target/kibana-serverless-$BASE_VERSION-docker-image.tar.gz"
docker tag "$KIBANA_IMAGE" "$KIBANA_IMAGE-amd64"

docker rmi "$KIBANA_IMAGE"
docker load < "target/kibana-serverless-$BASE_VERSION-docker-image-aarch64.tar.gz"
docker tag "$KIBANA_IMAGE" "$KIBANA_IMAGE-arm64"

echo "--- Push images"
docker image push "$KIBANA_IMAGE-arm64"
docker image push "$KIBANA_IMAGE-amd64"

echo "--- Create and push manifests"
docker manifest create \
  "$KIBANA_IMAGE" \
  --amend "$KIBANA_IMAGE-arm64" \
  --amend "$KIBANA_IMAGE-amd64"
docker manifest push "$KIBANA_IMAGE"

if [[ "$BUILDKITE_BRANCH" == "$KIBANA_BASE_BRANCH" ]] && [[ "${BUILDKITE_PULL_REQUEST:-false}" == "false" ]]; then
  docker manifest create \
    "$KIBANA_BASE_IMAGE:latest" \
    --amend "$KIBANA_IMAGE-arm64" \
    --amend "$KIBANA_IMAGE-amd64"
  docker manifest push "$KIBANA_BASE_IMAGE:latest"
fi

docker logout docker.elastic.co

cat << EOF | buildkite-agent annotate --style "info" --context image
  ### Serverless Images

  Manifest: \`$KIBANA_IMAGE\`

  AMD64: \`$KIBANA_IMAGE-amd64\`

  ARM64: \`$KIBANA_IMAGE-arm64\`
EOF

if [[ "${BUILDKITE_PULL_REQUEST:-false}" != "false" ]]; then
  buildkite-agent meta-data set pr_comment:build_serverless:head "* Kibana Serverless Image: \`$KIBANA_IMAGE\`"
  buildkite-agent meta-data set pr_comment:early_comment_job_id "$BUILDKITE_JOB_ID"
fi

echo "--- Build dependencies report"
node scripts/licenses_csv_report "--csv=target/dependencies-$GIT_ABBREV_COMMIT.csv"

echo "--- Upload CDN assets"
cd target
gcloud auth activate-service-account --key-file <(echo "$GCS_SA_CDN_KEY")

CDN_ASSETS_FOLDER=$(mktemp -d)
tar -xf "kibana-$BASE_VERSION-cdn-assets.tar.gz" -C "$CDN_ASSETS_FOLDER" --strip=1

gsutil -m cp -r "$CDN_ASSETS_FOLDER/*" "gs://$GCS_SA_CDN_BUCKET/$GIT_ABBREV_COMMIT"
gcloud auth revoke "$GCS_SA_CDN_EMAIL"

echo "--- Validate CDN assets"
(
  shopt -s globstar
  THREADS=$(grep -c ^processor /proc/cpuinfo)
  i=0
  cd $CDN_ASSETS_FOLDER
  for CDN_ASSET in **/*; do
    ((i=(i+1)%THREADS)) || wait
    if [[ -f "$CDN_ASSET" ]]; then
      echo -n "Testing $CDN_ASSET..."
      curl -I --write-out '%{http_code}\n' --fail --silent --output /dev/null "$GCS_SA_CDN_URL/$CDN_ASSET"
    fi
  done
)

echo "--- Upload archives"
buildkite-agent artifact upload "kibana-$BASE_VERSION-linux-x86_64.tar.gz"
buildkite-agent artifact upload "kibana-$BASE_VERSION-linux-aarch64.tar.gz"
buildkite-agent artifact upload "kibana-$BASE_VERSION-docker-image.tar.gz"
buildkite-agent artifact upload "kibana-$BASE_VERSION-docker-image-aarch64.tar.gz"
buildkite-agent artifact upload "kibana-$BASE_VERSION-cdn-assets.tar.gz"
buildkite-agent artifact upload "dependencies-$GIT_ABBREV_COMMIT.csv"

# This part is related with updating the configuration of kibana-controller,
# so that new stack instances contain the latest and greatest image of kibana,
# and the respective stack components of course.
echo "--- Trigger image tag update"
if [[ "$BUILDKITE_BRANCH" == "$KIBANA_BASE_BRANCH" ]] && [[ "${BUILDKITE_PULL_REQUEST:-false}" == "false" ]]; then
  cat << EOF | buildkite-agent pipeline upload
steps:
  - label: ":argo: Update kibana image tag for kibana-controller using gpctl"
    branches: main
    trigger: gpctl-promote-with-e2e-tests
    build:
      env:
        SERVICE_COMMIT_HASH: "$GIT_ABBREV_COMMIT"
        SERVICE: kibana
        REMOTE_SERVICE_CONFIG: https://raw.githubusercontent.com/elastic/serverless-gitops/main/gen/gpctl/kibana/dev.yaml
        DRY_RUN: "${DRY_RUN:-false}"
EOF

else
  echo "Skipping update for untracked branch $BUILDKITE_BRANCH"
fi
