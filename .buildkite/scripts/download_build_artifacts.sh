#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/common/util.sh"

if [[ "${KIBANA_BUILD_ID:-}" != "false" ]]; then
  if [[ ! -d "$KIBANA_BUILD_LOCATION/bin" ]]; then
    echo '--- Downloading Distribution'

    cd "$WORKSPACE"

    # [rspack-transition] The build step records which build ID to use.
    # Falls back to KIBANA_BUILD_ID or BUILDKITE_BUILD_ID for non-PR pipelines.
    EFFECTIVE_BUILD_ID=$(buildkite-agent meta-data get "kibana-effective-build-id" 2>/dev/null || echo "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}")

    download_tmp_artifact kibana-default.tar.zst . "$EFFECTIVE_BUILD_ID"

    mkdir -p "$KIBANA_BUILD_LOCATION"
    tar -xf kibana-default.tar.zst -I zstd -C "$KIBANA_BUILD_LOCATION" --strip=1

    if is_pr_with_label "ci:build-example-plugins"; then
      # Testing against an example plugin distribution is not supported,
      # mostly due to snapshot failures when testing UI element lists
      rm -rf "$KIBANA_BUILD_LOCATION/plugins"
      mkdir "$KIBANA_BUILD_LOCATION/plugins"
    fi

    cd "$KIBANA_DIR"
  fi
fi
