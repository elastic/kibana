#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh

echo "--- ES Snapshot Cache Diagnostic"
echo "Checking cached ES snapshot archives for corruption"
echo ""

CACHE_DIRS=("$ES_CACHE_DIR/cache" ".es/cache")
KIBANA_VERSION=$(jq -r .version package.json)
MANIFEST_BASE="https://storage.googleapis.com/kibana-ci-es-snapshots-daily"

echo "Kibana version: $KIBANA_VERSION"
echo "ES_CACHE_DIR: $ES_CACHE_DIR"
echo "ES_SNAPSHOT_MANIFEST: ${ES_SNAPSHOT_MANIFEST:-<not set>}"
echo ""

# Resolve the manifest URL
if [[ -n "${ES_SNAPSHOT_MANIFEST:-}" ]]; then
  MANIFEST_URL="$ES_SNAPSHOT_MANIFEST"
else
  MANIFEST_URL="$MANIFEST_BASE/$KIBANA_VERSION/manifest-latest-verified.json"
fi

echo "=== Manifest ==="
echo "URL: $MANIFEST_URL"
MANIFEST_JSON=$(curl -sf "$MANIFEST_URL" || echo "FETCH_FAILED")
if [[ "$MANIFEST_JSON" == "FETCH_FAILED" ]]; then
  echo "WARNING: Failed to fetch manifest"
else
  echo "$MANIFEST_JSON" | jq '{id, branch, sha_short, version, generated}'
  echo ""

  # Extract archive URLs and checksums for this platform
  PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)
  if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
    ARCH="aarch64"
  else
    ARCH="x86_64"
  fi

  echo "Platform: $PLATFORM, Arch: $ARCH"
  echo ""
  echo "Archives in manifest for this platform:"
  echo "$MANIFEST_JSON" | jq --arg p "$PLATFORM" --arg a "$ARCH" \
    '[.archives[] | select(.platform == $p and .architecture == $a)] | .[] | {filename, url, checksum, license}'
  echo ""

  # Get expected checksums from manifest
  ARCHIVE_URLS=$(echo "$MANIFEST_JSON" | jq -r --arg p "$PLATFORM" --arg a "$ARCH" \
    '.archives[] | select(.platform == $p and .architecture == $a) | .url')
fi

for CACHE_DIR in "${CACHE_DIRS[@]}"; do
  echo ""
  echo "=== Cache directory: $CACHE_DIR ==="

  if [[ ! -d "$CACHE_DIR" ]]; then
    echo "Directory does not exist"
    continue
  fi

  echo "Contents:"
  ls -lah "$CACHE_DIR" 2>/dev/null || echo "(empty or inaccessible)"
  echo ""

  # Check each archive
  for archive in "$CACHE_DIR"/*.tar.gz; do
    [[ -f "$archive" ]] || continue

    FILENAME=$(basename "$archive")
    echo "--- Archive: $FILENAME ---"

    # File metadata
    echo "Size: $(stat --format=%s "$archive" 2>/dev/null || stat -f%z "$archive" 2>/dev/null) bytes"
    echo "Modified: $(stat --format='%y' "$archive" 2>/dev/null || stat -f '%Sm' "$archive" 2>/dev/null)"
    echo ""

    # Check gzip magic bytes
    MAGIC=$(xxd -l 2 -p "$archive")
    if [[ "$MAGIC" == "1f8b" ]]; then
      echo "Gzip magic bytes: OK (1f8b)"
    else
      echo "Gzip magic bytes: INVALID ($MAGIC) - file is not a valid gzip archive!"
    fi

    # Test gzip integrity
    echo -n "Gzip integrity test: "
    if gzip -t "$archive" 2>&1; then
      echo "OK"
    else
      echo "FAILED - archive is corrupt!"
    fi
    echo ""

    # Compute SHA512
    echo -n "Computing SHA512... "
    ACTUAL_SHA512=$(sha512sum "$archive" 2>/dev/null | cut -d' ' -f1 || shasum -a 512 "$archive" 2>/dev/null | cut -d' ' -f1)
    echo "done"
    echo "Actual SHA512:   $ACTUAL_SHA512"

    # Fetch expected checksum from the current manifest
    if [[ "$MANIFEST_JSON" != "FETCH_FAILED" ]]; then
      ARCHIVE_URL=$(echo "$MANIFEST_JSON" | jq -r --arg f "$FILENAME" \
        '.archives[] | select(.filename == $f) | .url')
      if [[ -n "$ARCHIVE_URL" ]]; then
        echo "Archive URL (current manifest): $ARCHIVE_URL"
        CHECKSUM_URL="${ARCHIVE_URL}.sha512"
        EXPECTED_SHA512=$(curl -sf "$CHECKSUM_URL" | cut -d' ' -f1 || echo "FETCH_FAILED")
        echo "Expected SHA512: $EXPECTED_SHA512"

        if [[ "$EXPECTED_SHA512" == "FETCH_FAILED" ]]; then
          echo "RESULT: Could not fetch expected checksum"
        elif [[ "$ACTUAL_SHA512" == "$EXPECTED_SHA512" ]]; then
          echo "RESULT: CHECKSUM MATCH - cache matches current manifest"
        else
          echo "RESULT: CHECKSUM MISMATCH - cache does NOT match current manifest"
        fi

        # Also check Content-Length vs file size
        echo ""
        REMOTE_HEADERS=$(curl -sI "$ARCHIVE_URL" 2>/dev/null || echo "")
        CONTENT_LENGTH=$(echo "$REMOTE_HEADERS" | grep -i 'content-length' | tr -d '\r' | awk '{print $2}')
        REMOTE_ETAG=$(echo "$REMOTE_HEADERS" | grep -i '^etag' | tr -d '\r' | awk '{print $2}')
        FILE_SIZE=$(stat --format=%s "$archive" 2>/dev/null || stat -f%z "$archive" 2>/dev/null)
        echo "Remote Content-Length: ${CONTENT_LENGTH:-unknown} bytes"
        echo "Remote ETag:          ${REMOTE_ETAG:-unknown}"
        echo "Local file size:      $FILE_SIZE bytes"
        if [[ -n "$CONTENT_LENGTH" ]]; then
          if [[ "$FILE_SIZE" == "$CONTENT_LENGTH" ]]; then
            echo "RESULT: File size matches Content-Length"
          else
            DIFF=$((CONTENT_LENGTH - FILE_SIZE))
            echo "RESULT: FILE SIZE MISMATCH - off by $DIFF bytes"
          fi
        fi
      else
        echo "No matching archive URL found in manifest for $FILENAME"
      fi
    fi

    # Check if the cached file matches a DIFFERENT (older) manifest snapshot.
    # The VM image may have been built with a snapshot that has since been replaced.
    # Try the etag from the .meta file against the current archive URL to see if
    # they refer to different builds.
    META_ETAG=""
    if [[ -f "${archive}.meta" ]]; then
      META_ETAG=$(jq -r '.etag // empty' "${archive}.meta" 2>/dev/null || true)
    fi
    if [[ -n "$META_ETAG" && -n "${REMOTE_ETAG:-}" ]]; then
      echo ""
      echo "ETag comparison:"
      echo "  Cached .meta etag: $META_ETAG"
      echo "  Current remote:    $REMOTE_ETAG"
      if [[ "$META_ETAG" == "$REMOTE_ETAG" ]]; then
        echo "  RESULT: ETags match - cache was downloaded from the current snapshot"
      else
        echo "  RESULT: ETags DIFFER - cache was downloaded from a DIFFERENT snapshot build"
        echo "  (The snapshot was likely promoted after the VM image was built)"
      fi
    fi
    echo ""

    # Check .meta file
    META_FILE="${archive}.meta"
    if [[ -f "$META_FILE" ]]; then
      echo "Meta file contents:"
      cat "$META_FILE"
    else
      echo "No .meta file found"
    fi

    echo ""
    echo "---"
  done
done

echo ""
echo "=== VM Image Info ==="
# Try to get image creation time from GCP metadata
IMAGE_NAME=$(curl -sf -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/image 2>/dev/null || echo "unknown")
echo "VM Image: $IMAGE_NAME"
INSTANCE_CREATED=$(curl -sf -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/created-date 2>/dev/null || echo "unknown")
echo "Instance created: $INSTANCE_CREATED"
echo ""

echo "=== Disk usage ==="
df -h "$ES_CACHE_DIR" 2>/dev/null || true
echo ""

echo "--- Diagnostic complete ---"
