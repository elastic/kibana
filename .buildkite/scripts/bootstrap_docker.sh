#!/bin/bash

set -euo pipefail

export DOCKER_BUILDKIT=1

export BASE_IMAGE="us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:$BUILDKITE_COMMIT"

# docker build -t "$BASE_IMAGE" -f .buildkite/Dockerfile . --progress plain
# docker push "$BASE_IMAGE"

docker buildx create --use && \
docker buildx build -t "$BASE_IMAGE" -f .buildkite/Dockerfile . --progress plain \
  --output type=image,name="$BASE_IMAGE",push=true \
  --cache-to type=registry,ref=us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:cache \
  --cache-from type=registry,ref=us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:cache

cat << EOF | buildkite-agent annotate --style 'info' --context 'docker-images'
## Docker Images

### Bootstrapped

\`$BASE_IMAGE\`

#### Bash Shell

\`docker run --rm -it $BASE_IMAGE bash\`
EOF
