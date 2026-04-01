#!/usr/bin/env bash

set -euo pipefail

BUCKET_NAME="kibana-ai-assistant-kb-artifacts-dev"
GCS_BUCKET="gs://$BUCKET_NAME"

# Determine Kibana directory (assume script is run from repo root if KIBANA_DIR is not set)
KIBANA_DIR="${KIBANA_DIR:-$(pwd)}"
ARTIFACTS_DIR="$KIBANA_DIR/build/kb-artifacts"

echo "--- Activate GCP service account for $GCS_BUCKET"
.buildkite/scripts/common/activate_service_account.sh "$GCS_BUCKET"

echo "--- Upload kb-artifacts .zip files to $GCS_BUCKET"

if [[ ! -d "$ARTIFACTS_DIR" ]]; then
  echo "Artifacts directory not found: $ARTIFACTS_DIR"
  exit 1
fi

shopt -s nullglob
ZIP_FILES=("$ARTIFACTS_DIR"/*.zip)
shopt -u nullglob

if [[ ${#ZIP_FILES[@]} -eq 0 ]]; then
  echo "No .zip artifacts found in $ARTIFACTS_DIR"
  exit 1
fi

for zip_file in "${ZIP_FILES[@]}"; do
  echo "Uploading $(basename "$zip_file") to $GCS_BUCKET (overwriting if exists)"
  gsutil -o "GSUtil:no_clobber=False" cp "$zip_file" "$GCS_BUCKET/"
done

echo "Finished uploading kb-artifacts to $GCS_BUCKET"
