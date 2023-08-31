#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/steps/artifacts/env.sh

GIT_ABBREV_COMMIT=${BUILDKITE_COMMIT:0:12}
KIBANA_IMAGE="docker.elastic.co/kibana-ci/kibana-serverless:git-$GIT_ABBREV_COMMIT"

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
  --docker-tag="git-$GIT_ABBREV_COMMIT" \
  --skip-docker-ubuntu \
  --skip-docker-ubi \
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

echo "--- Create manifest"
docker manifest create \
  "$KIBANA_IMAGE" \
  --amend "$KIBANA_IMAGE-arm64" \
  --amend "$KIBANA_IMAGE-amd64"

echo "--- Push manifest"
docker manifest push "$KIBANA_IMAGE"
docker logout docker.elastic.co

cat << EOF | buildkite-agent annotate --style "info" --context image
  ### Container Images

  Manifest: \`$KIBANA_IMAGE\`

  AMD64: \`$KIBANA_IMAGE-amd64\`

  ARM64: \`$KIBANA_IMAGE-arm64\`
EOF

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

# This part is related with updating the configuration of kibana-controller,
# so that new stack instances contain the latest and greatest image of kibana,
# and the respective stack components of course.
echo "--- Trigger image tag update"
if [[ "$BUILDKITE_BRANCH" == "$KIBANA_BASE_BRANCH" ]]; then
  cat << EOF | buildkite-agent pipeline upload
steps:
  - label: ":argo: Update kibana image tag for kibana-controller using gpctl"
    async: true
    branches: main
    trigger: gpctl-promote-with-e2e-tests
    build:
      env:
        SERVICE_COMMIT_HASH: $GIT_ABBREV_COMMIT
        REMOTE_SERVICE_CONFIG: https://raw.githubusercontent.com/elastic/serverless-gitops/main/gen/gpctl/kibana/config.yaml
        SERVICE: kibana-controller
        NAMESPACE: kibana-ci
        IMAGE_NAME: kibana-serverless
EOF

else
  echo "Skipping update for untracked branch $BUILDKITE_BRANCH"
fi
