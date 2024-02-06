#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/artifacts/env.sh

echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
mkdir -p target

echo "--- Build FIPS image"
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
    --skip-docker-ubuntu \
    --skip-docker-cloud \
    --skip-docker-serverless \
    --skip-docker-contexts

docker logout docker.elastic.co

# Moving to `target/` first will keep `buildkite-agent` from including directories in the artifact name
cd "$KIBANA_DIR/target"
buildkite-agent artifact upload "./*.tar.gz;./*.zip;./*.deb;./*.rpm"
