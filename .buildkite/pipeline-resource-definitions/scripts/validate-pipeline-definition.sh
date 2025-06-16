#!/usr/bin/env bash

# renovate.json tracks this file for updating the pipelib docker image, update the path if you move this file
# This script is used to validate a single RRE for a pipeline definition.

TARGET_FILE=$1

if [ -z "$TARGET_FILE" ]; then
  echo "Usage: $0 <path_to_your_pipeline_file>"
  exit 1
fi

echo "Validating $TARGET_FILE..."
ABSOLUTE_PATH=$(realpath "$TARGET_FILE")
FILE_NAME=$(basename "$ABSOLUTE_PATH")
FOLDER_NAME=$(dirname "$ABSOLUTE_PATH")

docker run \
 --mount type=bind,source="$FOLDER_NAME",target=/home/app/ \
  docker.elastic.co/ci-agent-images/pipelib:0.8.0@sha256:641d7fc6cfe473900a1fbe49876762916d804b09fdf2945f74e9f803f3073779 \
  rre validate --backstage-entity-aware "/home/app/$FILE_NAME"

if [ $? -ne 0 ]; then
  echo "$FILE_NAME invalid ❌"
  exit 1
else
  echo "$FILE_NAME valid ✅"
  exit 0
fi
