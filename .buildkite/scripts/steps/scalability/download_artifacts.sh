#!/usr/bin/env bash

set -euo pipefail

mkdir -p "$SCALABILITY_ARTIFACTS_LOCATION"

gsutil cp "$GCS_BUCKET/LATEST" "$SCALABILITY_ARTIFACTS_LOCATION/"
HASH=`cat $SCALABILITY_ARTIFACTS_LOCATION/LATEST`
gsutil cp -r "$GCS_BUCKET/$HASH" "$SCALABILITY_ARTIFACTS_LOCATION/"

echo "Unzip kibana build, plugins and scalability traces"
cd "$WORKSPACE"
mkdir -p "$KIBANA_BUILD_LOCATION"
tar -xzf "$GCS_ARTIFACTS_DIR/$HASH/kibana-default.tar.gz" -C "$KIBANA_BUILD_LOCATION" --strip=1

cd "$KIBANA_DIR"
tar -xzf "../$GCS_ARTIFACTS_DIR/$HASH/kibana-default-plugins.tar.gz"
tar -xzf "../$GCS_ARTIFACTS_DIR/$HASH/scalability_traces.tar.gz"
