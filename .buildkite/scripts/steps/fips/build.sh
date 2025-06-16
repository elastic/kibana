#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/artifacts/env.sh

mkdir -p target
download_artifact "kibana-$FULL_VERSION-linux-x86_64.tar.gz" ./target --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Build FIPS image"
node scripts/build \
    --skip-initialize \
    --skip-generic-folders \
    --skip-platform-folders \
    --skip-cdn-assets \
    --skip-archives \
    --docker-images \
    --docker-namespace="kibana-ci" \
    --docker-tag-qualifier="$BUILDKITE_COMMIT" \
    --docker-push \
    --skip-docker-ubi \
    --skip-docker-wolfi \
    --skip-docker-cloud \
    --skip-docker-cloud-fips \
    --skip-docker-serverless \
    --skip-docker-contexts

# Moving to `target/` first will keep `buildkite-agent` from including directories in the artifact name
cd "$KIBANA_DIR/target"
buildkite-agent artifact upload "./*docker-image*.tar.gz"

KIBANA_FIPS_IMAGE="docker.elastic.co/kibana-ci/kibana-wolfi-fips:$FULL_VERSION-$BUILDKITE_COMMIT"

cat <<EOF | buildkite-agent annotate --style "info" --context kibana-wolfi-fips-image

  Kibana FIPS image: \`$KIBANA_FIPS_IMAGE\`
EOF

buildkite-agent meta-data set pr_comment:build_fips:head "* Kibana FIPS Image: \`$KIBANA_FIPS_IMAGE\`"
buildkite-agent meta-data set pr_comment:early_comment_job_id "$BUILDKITE_JOB_ID"
