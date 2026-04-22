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
  docker.elastic.co/ci-agent-images/pipelib:0.9.0@sha256:63d83c972bdb7619a22632dcab41beee5bde9a6f8e74003f53732dadc718275f \
  rre validate --backstage-entity-aware "/home/app/$FILE_NAME"

if [ $? -ne 0 ]; then
  echo "$FILE_NAME invalid ❌"
  exit 1
else
  echo "$FILE_NAME valid ✅"
  exit 0
fi
