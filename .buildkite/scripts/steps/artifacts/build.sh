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
node scripts/build "$RELEASE_ARG" --all-platforms --debug --docker-cross-compile --skip-docker-cloud

echo "--- Build dependencies report"
node scripts/licenses_csv_report "--csv=target/dependencies-$VERSION.csv"

echo "--- Extract default i18n messages"
mkdir -p target/i18n
node scripts/i18n_extract
buildkite-agent artifact upload "target/i18n/en.json"

# Release verification
if [[ "${RELEASE_BUILD:-}" == "true" ]]; then
  echo "--- Build and push Kibana Cloud Distribution"
  # This doesn't meet the requirements for a release image, implementation TBD
  # Beats artifacts will need to match a specific commit sha that matches other stack iamges
  # For now this is a placeholder step that will allow us to run automated Cloud tests
  # against a best guess approximation of a release image
  echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
  trap 'docker logout docker.elastic.co' EXIT

  node scripts/build \
    "$RELEASE_ARG" \
    --skip-initialize \
    --skip-generic-folders \
    --skip-platform-folders \
    --skip-archives \
    --docker-images \
    --docker-tag-qualifier="$GIT_COMMIT" \
    --docker-push \
    --skip-docker-ubi \
    --skip-docker-ubuntu \
    --skip-docker-contexts
fi

cd target
buildkite-agent artifact upload "*"
cd -
