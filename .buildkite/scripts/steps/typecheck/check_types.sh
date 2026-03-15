#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo "--- Restore tsbuildinfo cache"

TSBUILDINFO_CACHE_KEY="tsbuildinfo-$(git rev-parse HEAD~1 2>/dev/null || echo 'none')"
TSBUILDINFO_CACHE_ARCHIVE="/tmp/tsbuildinfo-cache.tar.gz"
TSBUILDINFO_CACHE_BUCKET="${KIBANA_CI_CACHE_BUCKET:-kibana-ci-cache}"
TSBUILDINFO_GCS_PATH="gs://${TSBUILDINFO_CACHE_BUCKET}/tsbuildinfo-cache/main-latest.tar.gz"

if gsutil -q stat "$TSBUILDINFO_GCS_PATH" 2>/dev/null; then
  echo "Downloading tsbuildinfo cache from GCS"
  gsutil -q cp "$TSBUILDINFO_GCS_PATH" "$TSBUILDINFO_CACHE_ARCHIVE" 2>/dev/null || true
  if [[ -f "$TSBUILDINFO_CACHE_ARCHIVE" ]]; then
    tar -xzf "$TSBUILDINFO_CACHE_ARCHIVE" 2>/dev/null || echo "Failed to extract tsbuildinfo cache, starting fresh"
    TSBUILDINFO_COUNT=$(find . -name '*.tsbuildinfo' 2>/dev/null | wc -l | tr -d ' ')
    echo "Restored $TSBUILDINFO_COUNT .tsbuildinfo files"
  fi
else
  echo "No tsbuildinfo cache found, running from scratch"
fi

echo --- Check Types

node scripts/type_check --with-archive

echo "--- Save tsbuildinfo cache"

TSBUILDINFO_FILES=$(find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' 2>/dev/null)
if [[ -n "$TSBUILDINFO_FILES" ]]; then
  TSBUILDINFO_COUNT=$(echo "$TSBUILDINFO_FILES" | wc -l | tr -d ' ')
  echo "Saving $TSBUILDINFO_COUNT .tsbuildinfo files to cache"
  echo "$TSBUILDINFO_FILES" | tar -czf "$TSBUILDINFO_CACHE_ARCHIVE" -T - 2>/dev/null || true
  if [[ -f "$TSBUILDINFO_CACHE_ARCHIVE" ]]; then
    gsutil -q cp "$TSBUILDINFO_CACHE_ARCHIVE" "$TSBUILDINFO_GCS_PATH" 2>/dev/null || echo "Failed to upload tsbuildinfo cache"
  fi
fi
