#!/usr/bin/env bash

set -euo pipefail

echo "[upload_kb_artifacts] Starting script"

BUCKET_NAME="kibana-ai-assistant-kb-artifacts-dev"
GCS_BUCKET="gs://$BUCKET_NAME"

echo "[upload_kb_artifacts] Target bucket: $GCS_BUCKET"

# Determine Kibana directory (assume script is run from repo root if KIBANA_DIR is not set)
KIBANA_DIR="${KIBANA_DIR:-$(pwd)}"
ARTIFACTS_DIR="$KIBANA_DIR/build/kb-artifacts"

echo "[upload_kb_artifacts] KIBANA_DIR=$KIBANA_DIR"
echo "[upload_kb_artifacts] ARTIFACTS_DIR=$ARTIFACTS_DIR"

echo "--- Activate GCP service account for $GCS_BUCKET"
echo "[upload_kb_artifacts] Invoking activate_service_account.sh"
.buildkite/scripts/common/activate_service_account.sh "$GCS_BUCKET"
echo "[upload_kb_artifacts] Service account activated"

echo "--- Upload kb-artifacts .zip files to $GCS_BUCKET"

echo "[upload_kb_artifacts] Checking artifacts directory exists"
if [[ ! -d "$ARTIFACTS_DIR" ]]; then
  echo "[upload_kb_artifacts] Artifacts directory not found: $ARTIFACTS_DIR"
  exit 1
fi

echo "[upload_kb_artifacts] Listing contents of $ARTIFACTS_DIR:"
ls -la "$ARTIFACTS_DIR" || true

echo "[upload_kb_artifacts] Collecting .zip files"
shopt -s nullglob
ZIP_FILES=("$ARTIFACTS_DIR"/*.zip)
shopt -u nullglob

echo "[upload_kb_artifacts] Found ${#ZIP_FILES[@]} .zip file(s)"

if [[ ${#ZIP_FILES[@]} -eq 0 ]]; then
  echo "[upload_kb_artifacts] No .zip artifacts found in $ARTIFACTS_DIR"
  exit 1
fi

for zip_file in "${ZIP_FILES[@]}"; do
  echo "[upload_kb_artifacts] Uploading $(basename "$zip_file") to $GCS_BUCKET (overwriting if exists)"
  gsutil -o "GSUtil:no_clobber=False" cp "$zip_file" "$GCS_BUCKET/"
  echo "[upload_kb_artifacts] Finished uploading $(basename "$zip_file")"
done

echo "[upload_kb_artifacts] Finished uploading kb-artifacts to $GCS_BUCKET"
