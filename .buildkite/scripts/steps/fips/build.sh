#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/artifacts/env.sh

mkdir -p target

echo "--- Build Kibana FIPS"
node scripts/build \
  --all-platforms \
  --skip-os-packages \
  --docker-fips-images \
  --docker-tag-qualifier="$BUILDKITE_COMMIT"
# --skip-initialize \
# --skip-generic-folders \
# --skip-platform-folders \
# --skip-cdn-assets \

# Moving to `target/` first will keep `buildkite-agent` from including directories in the artifact name
cd "$KIBANA_DIR/target"
buildkite-agent artifact upload "./*.tar.gz;./*.zip;./*.deb;./*.rpm"

docker load <"kibana-ubi-fips-${BASE_VERSION}-SNAPSHOT-docker-image.tar.gz"
docker run --rm -it -p 5601:5601/tcp "docker.elastic.co/kibana/kibana-ubi-fips:${BASE_VERSION}-SNAPSHOT-${BUILDKITE_COMMIT}"
