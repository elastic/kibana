#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

BASE_ESS_REPO=docker.elastic.co/elasticsearch-ci/elasticsearch-serverless
TARGET_IMAGE=docker.elastic.co/kibana-ci/elasticsearch-serverless:latest-verified

SOURCE_IMAGE_OR_TAG=$1
if [[ $SOURCE_IMAGE_OR_TAG =~ :[a-zA-Z_-]+$ ]]; then
  # $SOURCE_IMAGE_OR_TAG was a full image
  SOURCE_IMAGE=$SOURCE_IMAGE_OR_TAG
else
  # $SOURCE_IMAGE_OR_TAG was an image tag
  SOURCE_IMAGE="$BASE_ESS_REPO:$SOURCE_IMAGE_OR_TAG"
fi

echo "--- Promoting ${SOURCE_IMAGE_OR_TAG} to ':latest-verified'"

echo "Re-tagging $SOURCE_IMAGE -> $TARGET_IMAGE"

echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
docker pull "$SOURCE_IMAGE"
docker tag "$SOURCE_IMAGE" "$TARGET_IMAGE"
docker push "$TARGET_IMAGE"
docker logout docker.elastic.co

echo "Image push to $TARGET_IMAGE successful."

# annotate the build with some info about the docker image that was re-pushed and the hashes that were tested.
ORIG_IMG_DATA=$(docker inspect "$SOURCE_IMAGE")
ELASTIC_COMMIT_HASH=$(echo $ORIG_IMG_DATA | jq -r '.[].Config.Labels["org.opencontainers.image.revision"]')

cat << EOT | buildkite-agent annotate --style "success"
  <h2>Promotion successful!</h2><br/>
  New image: $TARGET_IMAGE<br/>
  Source image: $SOURCE_IMAGE<br/>
  Kibana commit: <a href="https://github.com/elastic/kibana/commit/$BUILDKITE_COMMIT">$BUILDKITE_COMMIT</a>
  Elasticsearch commit: <a href="https://github.com/elastic/elasticsearch/commit/$ELASTIC_COMMIT_HASH">$ELASTIC_COMMIT_HASH</a>
EOT

echo "Promotion successful! Henceforth, thou shall be named Sir $TARGET_IMAGE"

if [[ "$UPLOAD_MANIFEST" =~ ^(1|true)$ && "$SOURCE_IMAGE_OR_TAG" =~ ^git-[0-9a-fA-F]{12}$ ]]; then
  echo "--- Uploading latest-verified manifest to GCS"
  ES_SERVERLESS_BUCKET=kibana-ci-es-serverless-images
  MANIFEST_NAME=latest-verified.json
  cat << EOT >> $MANIFEST_NAME
{
  "build_url": "$BUILDKITE_BUILD_URL",
  "kibana_commit": "$BUILDKITE_COMMIT",
  "kibana_branch": "$BUILDKITE_BRANCH",
  "elasticsearch_serverless_tag": "$SOURCE_IMAGE_OR_TAG",
  "elasticsearch_serverless_commit": "TODO: this currently can't be decided",
  "elasticsearch_commit": "$ELASTIC_COMMIT_HASH",
  "created_at": "`date`",
  "timestamp": "`node -p 'Date.now()'`"
}
EOT

  gsutil -h "Cache-Control:no-cache, max-age=0, no-transform" cp latest-verified.json "gs://$ES_SERVERLESS_BUCKET/latest-verified.json"
else
  echo "--- Skipping uploading of latest-verified manifest to GCS, flag was not provided"
fi
