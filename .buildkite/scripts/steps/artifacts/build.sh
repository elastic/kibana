#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

if [[ "${RELEASE_BUILD:-}" == "true" ]]; then
  VERSION="$(jq -r '.version' package.json)"
  RELEASE_ARG="--release"

  # This doesn't meet the requirements for a release image, implementation TBD
  # Beats artifacts will need to match a specific commit sha that matches other stack iamges
  BUILD_CLOUD_ARG="--skip-docker-cloud"
else
  VERSION="$(jq -r '.version' package.json)-SNAPSHOT"
  RELEASE_ARG=""
  BUILD_CLOUD_ARG=""
fi

echo "--- Build Kibana Distribution"
node scripts/build "$RELEASE_ARG" --all-platforms --debug --docker-cross-compile "$BUILD_CLOUD_ARG"

echo "--- Build dependencies report"
node scripts/licenses_csv_report "--csv=target/dependencies-$VERSION.csv"

cd target
buildkite-agent artifact upload "*"
cd -