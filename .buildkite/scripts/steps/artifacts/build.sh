#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Build Kibana Distribution"
# TODO: ?--release
node scripts/build --all-platforms --debug --skip-docker-cloud

echo "--- Build dependencies report"
node scripts/licenses_csv_report --csv=target/dependencies_report.csv

echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
trap 'docker logout docker.elastic.co' EXIT

docker pull docker.elastic.co/infra/release-manager:latest

VAULT_ROLE_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-role-id)"
VAULT_SECRET_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-secret-id)"
VAULT_ADDR="https://secrets.elastic.co:8200"


# TODO: snapshot | staging
WORKFLOW="snapshot"

BRANCH=$(jq -r .branch "package.json")
VERSION=$(jq -r .version "package.json")
COMMIT=$(git rev-parse HEAD)
QUALIFIER=""

docker run --rm \
  --name release-manager \
  -e VAULT_ADDR \
  -e VAULT_ROLE_ID \
  -e VAULT_SECRET_ID \
  --mount type=bind,readonly=false,src="$PWD/target",target=/artifacts \
  docker.elastic.co/infra/release-manager:latest \
    cli collect \
      --project kibana \
      --branch "$BRANCH" \
      --commit "$COMMIT" \
      --workflow "$WORKFLOW" \
      --version "$VERSION"
      --qualifier "$QUALIFIER"
      --artifact-set main
