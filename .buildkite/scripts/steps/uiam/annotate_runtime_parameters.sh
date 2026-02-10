#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

KIBANA_GITHUB_URL="https://github.com/elastic/kibana"

if [[ -z "${UIAM_IMAGE:-}" ]]; then
  echo "UIAM_IMAGE is not set"
  exit 1
elif [[ "$UIAM_IMAGE" != *"docker.elastic.co"* ]]; then
  echo "UIAM_IMAGE should be a docker.elastic.co image"
  exit 1
fi

# Pull the target image to get version info
docker_with_retry pull "$UIAM_IMAGE"
UIAM_VERSION=$(docker inspect --format='{{json .Config.Labels}}' "$UIAM_IMAGE" | jq -r '.["org.opencontainers.image.revision"] // "unknown"' | cut -c1-12)

# Find the most accurate image tag
if [[ "$UIAM_IMAGE" == *":git-"* ]]; then
  UIAM_IMAGE_FULL=$UIAM_IMAGE
else
  IMAGE_WITHOUT_TAG=$(echo "$UIAM_IMAGE" | cut -d: -f1)
  if [[ "$UIAM_VERSION" != "unknown" && "$UIAM_VERSION" != "null" ]]; then
    UIAM_IMAGE_FULL="${IMAGE_WITHOUT_TAG}:git-${UIAM_VERSION}"
  else
    UIAM_IMAGE_FULL=$UIAM_IMAGE
  fi
fi

buildkite-agent annotate --context kibana-commit --style info "Kibana version: $BUILDKITE_BRANCH / [$BUILDKITE_COMMIT]($KIBANA_GITHUB_URL/commit/$BUILDKITE_COMMIT)"
buildkite-agent annotate --context uiam-version --style info "UIAM version: \`${UIAM_VERSION}\`"

cat << EOF | buildkite-agent annotate --context uiam-image --style info
  UIAM image: \`${UIAM_IMAGE_FULL}\`

  To run this locally:
  \`\`\`
  UIAM_DOCKER_IMAGE=$UIAM_IMAGE_FULL node scripts/es serverless --uiam
  \`\`\`
EOF
