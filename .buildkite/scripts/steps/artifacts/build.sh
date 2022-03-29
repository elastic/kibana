#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

if [[ "${RELEASE_BUILD:-}" == "true" ]]; then
  VERSION="$(jq -r '.version' package.json)"
  RELEASE_ARG="--release"
else
  VERSION="$(jq -r '.version' package.json)-SNAPSHOT"
  RELEASE_ARG=""
fi

echo "--- Build Kibana Distribution"
node scripts/build "$RELEASE_ARG --all-platforms --debug --docker-cross-compile --skip-docker-cloud"

echo "--- Build dependencies report"
node scripts/licenses_csv_report "--csv=target/dependencies-$VERSION.csv"
