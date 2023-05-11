#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/steps/artifacts/env.sh

GIT_ABBREV_COMMIT=${BUILDKITE_COMMIT:0:12}
KIBANA_IMAGE_INPUT="docker.elastic.co/kibana-ci/kibana-serverless:git-$GIT_ABBREV_COMMIT"
KIBANA_IMAGE_OUTPUT="docker.elastic.co/kibana-ci/kibana:git-$GIT_ABBREV_COMMIT"

echo "--- Verify manifest does not already exist"
echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
trap 'docker logout docker.elastic.co' EXIT

if docker manifest inspect $KIBANA_IMAGE_OUTPUT &> /dev/null; then
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
docker rmi "$KIBANA_IMAGE_INPUT"
docker load < "target/kibana-serverless-$BASE_VERSION-docker-image.tar.gz"
docker tag "$KIBANA_IMAGE_INPUT" "$KIBANA_IMAGE_OUTPUT-amd64"

docker rmi "$KIBANA_IMAGE_INPUT"
docker load < "target/kibana-serverless-$BASE_VERSION-docker-image-aarch64.tar.gz"
docker tag "$KIBANA_IMAGE_INPUT" "$KIBANA_IMAGE_OUTPUT-arm64"

echo "--- Push images"
docker image push "$KIBANA_IMAGE_OUTPUT-arm64"
docker image push "$KIBANA_IMAGE_OUTPUT-amd64"

echo "--- Create manifest"
docker manifest create \
  "$KIBANA_IMAGE_OUTPUT" \
  --amend "$KIBANA_IMAGE_OUTPUT-arm64" \
  --amend "$KIBANA_IMAGE_OUTPUT-amd64"

echo "--- Push manifest"
docker manifest push "$KIBANA_IMAGE_OUTPUT"
docker logout docker.elastic.co

cat << EOF | buildkite-agent annotate --style "info" --context image
  ### Container Images

  Manifest: \`$KIBANA_IMAGE_OUTPUT\`

  AMD64: \`$KIBANA_IMAGE_OUTPUT-amd64\`

  ARM64: \`$KIBANA_IMAGE_OUTPUT-arm64\`
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
  - trigger: serverless-gitops-update-stack-image-tag
    async: true
    label: ":argo: Update image tag for Kibana"
    branches: main
    build:
      env:
        IMAGE_TAG: "git-$GIT_ABBREV_COMMIT"
        SERVICE: kibana-controller
        NAMESPACE: kibana-ci
        IMAGE_NAME: kibana
        COMMIT_MESSAGE: "gitops: update kibana tag to elastic/kibana@$GIT_ABBREV_COMMIT"
EOF

else
  echo "Skipping update for untracked branch $BUILDKITE_BRANCH"
fi
