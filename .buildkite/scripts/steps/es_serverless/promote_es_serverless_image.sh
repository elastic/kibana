#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

BASE_ES_SERVERLESS_REPO=docker.elastic.co/elasticsearch-ci/elasticsearch-serverless
TARGET_IMAGE=docker.elastic.co/kibana-ci/elasticsearch-serverless:latest-verified

ES_SERVERLESS_BUCKET=kibana-ci-es-serverless-images
MANIFEST_FILE_NAME=latest-verified.json

SOURCE_IMAGE_OR_TAG=$1
if [[ $SOURCE_IMAGE_OR_TAG =~ :[a-zA-Z_-]+$ ]]; then
  # $SOURCE_IMAGE_OR_TAG was a full image
  SOURCE_IMAGE=$SOURCE_IMAGE_OR_TAG
else
  # $SOURCE_IMAGE_OR_TAG was an image tag
  SOURCE_IMAGE="$BASE_ES_SERVERLESS_REPO:$SOURCE_IMAGE_OR_TAG"
fi

echo "--- Promoting ${SOURCE_IMAGE_OR_TAG} to ':latest-verified'"

echo "Re-tagging $SOURCE_IMAGE -> $TARGET_IMAGE"

echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
docker pull "$SOURCE_IMAGE"
docker tag "$SOURCE_IMAGE" "$TARGET_IMAGE"
docker push "$TARGET_IMAGE"

ORIG_IMG_DATA=$(docker inspect "$SOURCE_IMAGE")
ELASTIC_COMMIT_HASH=$(echo $ORIG_IMG_DATA | jq -r '.[].Config.Labels["org.opencontainers.image.revision"]')

docker logout docker.elastic.co

echo "Image push to $TARGET_IMAGE successful."
echo "Promotion successful! Henceforth, thou shall be named Sir $TARGET_IMAGE"

MANIFEST_UPLOAD_PATH="Skipped"
if [[ "$UPLOAD_MANIFEST" =~ ^(1|true)$ && "$SOURCE_IMAGE_OR_TAG" =~ ^git-[0-9a-fA-F]{12}$ ]]; then
  echo "--- Uploading latest-verified manifest to GCS"
  cat << EOT >> $MANIFEST_FILE_NAME
{
  "build_url": "$BUILDKITE_BUILD_URL",
  "kibana_commit": "$BUILDKITE_COMMIT",
  "kibana_branch": "$BUILDKITE_BRANCH",
  "elasticsearch_serverless_tag": "$SOURCE_IMAGE_OR_TAG",
  "elasticsearch_serverless_image_url: "$SOURCE_IMAGE",
  "elasticsearch_serverless_commit": "TODO: this currently can't be decided",
  "elasticsearch_commit": "$ELASTIC_COMMIT_HASH",
  "created_at": "`date`",
  "timestamp": "`FORCE_COLOR=0 node -p 'Date.now()'`"
}
EOT

  gsutil -h "Cache-Control:no-cache, max-age=0, no-transform" \
    cp $MANIFEST_FILE_NAME "gs://$ES_SERVERLESS_BUCKET/$MANIFEST_FILE_NAME"
  gsutil acl ch -u AllUsers:R "gs://$ES_SERVERLESS_BUCKET/$MANIFEST_FILE_NAME"
  MANIFEST_UPLOAD_PATH="<a href=\"https://storage.googleapis.com/$ES_SERVERLESS_BUCKET/$MANIFEST_FILE_NAME\">$MANIFEST_FILE_NAME</a>"

elif [[ "$UPLOAD_MANIFEST" =~ ^(1|true)$ ]]; then
  echo "--- Skipping upload of latest-verified manifest to GCS, ES Serverless build tag is not pointing to a hash"
elif [[ "$SOURCE_IMAGE_OR_TAG" =~ ^git-[0-9a-fA-F]{12}$ ]]; then
  echo "--- Skipping upload of latest-verified manifest to GCS, flag was not provided"
fi

echo "--- Annotating build with info"
cat << EOT | buildkite-agent annotate --style "success"
  <h2>Promotion successful!</h2>
  <br/>New image: $TARGET_IMAGE
  <br/>Source image: $SOURCE_IMAGE
  <br/>Kibana commit: <a href="https://github.com/elastic/kibana/commit/$BUILDKITE_COMMIT">$BUILDKITE_COMMIT</a>
  <br/>Elasticsearch commit: <a href="https://github.com/elastic/elasticsearch/commit/$ELASTIC_COMMIT_HASH">$ELASTIC_COMMIT_HASH</a>
  <br/>Manifest file: $MANIFEST_UPLOAD_PATH
EOT
