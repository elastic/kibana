#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

KIBANA_GITHUB_URL="https://github.com/elastic/kibana"

if [[ -z "${UIAM_COSMOSDB_IMAGE:-}" ]]; then
  echo "UIAM_COSMOSDB_IMAGE is not set"
  exit 1
elif [[ "$UIAM_COSMOSDB_IMAGE" != *"mcr.microsoft.com"* ]]; then
  echo "UIAM_COSMOSDB_IMAGE should be a mcr.microsoft.com image"
  exit 1
fi

# Pull the target image to get version info
docker_with_retry pull "$UIAM_COSMOSDB_IMAGE"
UIAM_COSMOSDB_VERSION=$(docker inspect --format='{{json .Config.Labels}}' "$UIAM_COSMOSDB_IMAGE" | jq -r '.["com.visualstudio.msdata.image.build.sourcebranchname"] // "unknown"')

# Find the most accurate image tag
if [[ "$UIAM_COSMOSDB_IMAGE" == *":vnext-EN"* ]]; then
  UIAM_COSMOSDB_IMAGE_FULL=$UIAM_COSMOSDB_IMAGE
else
  IMAGE_WITHOUT_TAG=$(echo "$UIAM_COSMOSDB_IMAGE" | cut -d: -f1)
  if [[ "$UIAM_COSMOSDB_VERSION" != "unknown" && "$UIAM_COSMOSDB_VERSION" != "null" ]]; then
    UIAM_COSMOSDB_IMAGE_FULL="${IMAGE_WITHOUT_TAG}:vnext-${UIAM_COSMOSDB_VERSION}"
  else
    UIAM_COSMOSDB_IMAGE_FULL=$UIAM_COSMOSDB_IMAGE
  fi
fi

buildkite-agent annotate --context kibana-commit --style info "Kibana version: $BUILDKITE_BRANCH / [$BUILDKITE_COMMIT]($KIBANA_GITHUB_URL/commit/$BUILDKITE_COMMIT)"
buildkite-agent annotate --context uiam-version --style info "UIAM Cosmos DB Emulator version: \`${UIAM_COSMOSDB_VERSION}\`"

cat << EOF | buildkite-agent annotate --context uiam-image --style info
  UIAM Cosmos DB Emulator image: \`${UIAM_COSMOSDB_IMAGE_FULL}\`

  To run this locally:
  \`\`\`
  UIAM_COSMOSDB_DOCKER_IMAGE=$UIAM_COSMOSDB_IMAGE_FULL node scripts/es serverless --uiam
  \`\`\`
EOF
