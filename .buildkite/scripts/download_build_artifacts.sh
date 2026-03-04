#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/common/util.sh"

if [[ "${KIBANA_BUILD_ID:-}" != "false" ]]; then
  if [[ ! -d "$KIBANA_BUILD_LOCATION/bin" ]]; then
    echo '--- Downloading Distribution'

    EFFECTIVE_BUILD_ID="${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
    DIST_CACHE_DIR="/tmp/kibana-dist-cache/${EFFECTIVE_BUILD_ID}"
    DIST_CACHE_TARBALL="${DIST_CACHE_DIR}/kibana-default.tar.gz"
    DIST_CACHE_READY="${DIST_CACHE_DIR}/.ready"
    DIST_CACHE_LOCK="${DIST_CACHE_DIR}/.lock"

    mkdir -p "$DIST_CACHE_DIR"

    # Use flock to ensure only one agent downloads/extracts at a time
    if [[ -f "$DIST_CACHE_READY" ]]; then
      echo "Distribution already cached at $DIST_CACHE_DIR, copying to build location"
    else
      (
        flock -w 300 9 || { echo "Failed to acquire distribution cache lock"; exit 1; }

        # Double-check after acquiring lock (another process may have finished)
        if [[ ! -f "$DIST_CACHE_READY" ]]; then
          echo "Downloading distribution to shared cache"
          cd "$DIST_CACHE_DIR"
          download_artifact kibana-default.tar.gz . --build "$EFFECTIVE_BUILD_ID"
          touch "$DIST_CACHE_READY"
        else
          echo "Distribution was cached by another agent while waiting for lock"
        fi
      ) 9>"$DIST_CACHE_LOCK"
    fi

    # Extract from cached tarball
    mkdir -p "$KIBANA_BUILD_LOCATION"
    tar -xzf "$DIST_CACHE_TARBALL" -C "$KIBANA_BUILD_LOCATION" --strip=1

    if is_pr_with_label "ci:build-example-plugins"; then
      rm -rf "$KIBANA_BUILD_LOCATION/plugins"
      mkdir "$KIBANA_BUILD_LOCATION/plugins"
    fi

    cd "$KIBANA_DIR"
  fi
fi
