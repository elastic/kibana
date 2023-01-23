#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/steps/artifacts/env.sh

GIT_ABBREV_COMMIT=${BUILDKITE_COMMIT:0:7}
KIBANA_IMAGE="docker.elastic.co/kibana-ci/kibana:$GIT_ABBREV_COMMIT"

echo "--- Verify manifest does not already exist"
echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
trap 'docker logout docker.elastic.co' EXIT

if docker manifest inspect $KIBANA_IMAGE &> /dev/null; then
  echo "Manifest already exists, exiting"
  exit 1
fi

echo "--- Build images"
node scripts/build \
  --debug \
  --release \
  --docker-cross-compile \
  --docker-images \
  --docker-namespace="kibana-ci" \
  --docker-tag="$GIT_ABBREV_COMMIT" \
  --skip-docker-ubi \
  --skip-docker-cloud \
  --skip-docker-contexts

echo "--- Tag images"
docker rmi "$KIBANA_IMAGE"
docker load < "target/kibana-$BASE_VERSION-docker-image.tar.gz"
docker tag "$KIBANA_IMAGE" "$KIBANA_IMAGE-amd64"

docker rmi "$KIBANA_IMAGE"
docker load < "target/kibana-$BASE_VERSION-docker-image-aarch64.tar.gz"
docker tag "$KIBANA_IMAGE" "$KIBANA_IMAGE-arm64"

echo "--- Push images"
docker image push "$KIBANA_IMAGE-arm64"
docker image push "$KIBANA_IMAGE-amd64"

echo "--- Create manifest"
docker rmi "$KIBANA_IMAGE"
docker manifest create \
  "$KIBANA_IMAGE" \
  --amend "$KIBANA_IMAGE-arm64" \
  --amend "$KIBANA_IMAGE-amd64"

echo "--- Push manifest"
docker manifest push "$KIBANA_IMAGE"
docker logout docker.elastic.co

echo "--- Build dependencies report"
node scripts/licenses_csv_report "--csv=target/dependencies-$GIT_ABBREV_COMMIT.csv"

echo "--- Upload artifacts"
cd target
buildkite-agent artifact upload "kibana-$BASE_VERSION-linux-x86_64.tar.gz"
buildkite-agent artifact upload "kibana-$BASE_VERSION-linux-aarch64.tar.gz"
buildkite-agent artifact upload "kibana-$BASE_VERSION-docker-image.tar.gz"
buildkite-agent artifact upload "kibana-$BASE_VERSION-docker-image-aarch64.tar.gz"
buildkite-agent artifact upload "dependencies-$GIT_ABBREV_COMMIT.csv"
cd -

echo "--- Trigger image tag update"
if [[ "$BUILDKITE_BRANCH" == "$KIBANA_BASE_BRANCH" ]]; then

  cat << EOF | buildkite-agent pipeline upload
steps:
  - trigger: k8s-gitops-update-image-tag
    label: "Update image tag for deployment-api"
    branches: main
    build:
      env:
        MODE: sed
        TARGET_FILE: app-config-controllers.yaml
        IMAGE_TAG: "$KIBANA_IMAGE"
        SERVICE: app-config-controllers
EOF

elif
  echo "Skipping update for untracked branch $BUILDKITE_BRANCH"
fi
