#!/usr/bin/env bash

set -euo pipefail

KIBANA_GITHUB_URL="https://github.com/elastic/kibana"
ES_SERVERLESS_GITHUB_URL="https://github.com/elastic/elasticsearch-serverless"

if [[ -z "$ES_SERVERLESS_IMAGE" ]]; then
  echo "ES_SERVERLESS_IMAGE is not set"
  exit 1
elif [[ "$ES_SERVERLESS_IMAGE" != *"docker.elastic.co"* ]]; then
  echo "ES_SERVERLESS_IMAGE should be a docker.elastic.co image"
  exit 1
fi

# Pull the target image
if [[ $ES_SERVERLESS_IMAGE != *":git-"* ]]; then
  docker pull "$ES_SERVERLESS_IMAGE"
  ES_SERVERLESS_VERSION=$(docker inspect --format='{{json .Config.Labels}}' "$ES_SERVERLESS_IMAGE" | jq -r '.["org.opencontainers.image.revision"]' | cut -c1-12)

  IMAGE_WITHOUT_TAG=$(echo "$ES_SERVERLESS_IMAGE" | cut -d: -f1)
  ES_SERVERLESS_IMAGE_FULL="${IMAGE_WITHOUT_TAG}:git-${ES_SERVERLESS_VERSION}"
else
  ES_SERVERLESS_IMAGE_FULL=$ES_SERVERLESS_IMAGE
  ES_SERVERLESS_VERSION=$(echo "$ES_SERVERLESS_IMAGE_FULL" | cut -d: -f2 | cut -d- -f2)
fi

buildkite-agent annotate --context kibana-commit --style info "Kibana version: $BUILDKITE_BRANCH / [$BUILDKITE_COMMIT]($KIBANA_GITHUB_URL/commit/$BUILDKITE_COMMIT)"
buildkite-agent annotate --context es-serverless-commit --style info "ES Serverless version: [$ES_SERVERLESS_VERSION]($ES_SERVERLESS_GITHUB_URL/commit/$ES_SERVERLESS_VERSION)"

cat << EOF | buildkite-agent annotate --context es-serverless-image --style info
  ES Serverless image: \`${ES_SERVERLESS_IMAGE_FULL}\`

  To run this locally:
  \`\`\`
  node scripts/es serverless --image $ES_SERVERLESS_IMAGE_FULL
  \`\`\`
EOF
