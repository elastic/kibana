#!/usr/bin/env bash

set -euo pipefail

export DOCKER_BUILDKIT=1

export BASE_IMAGE="us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:$BUILDKITE_COMMIT"
export BUILD_IMAGE="us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/default-build:$BUILDKITE_COMMIT"

docker build \
  -t "$BUILD_IMAGE" \
  -f .buildkite/Dockerfile-build \
  --build-arg "BASE_IMAGE=us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:$BUILDKITE_COMMIT" \
  --build-arg "GIT_COMMIT=$BUILDKITE_COMMIT" \
  --progress plain \
  .

docker push "$BUILD_IMAGE"

cat << EOF | buildkite-agent annotate --style 'info' --context 'docker-images'
## Docker Images

### Bootstrapped

\`$BASE_IMAGE\`

#### Bash Shell

\`docker run --rm -it $BASE_IMAGE bash\`

### With Distribution

\`$BUILD_IMAGE\`

#### Bash Shell

\`docker run --rm -it $BUILD_IMAGE bash\`
EOF
