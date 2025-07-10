#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/common/util.sh"

if [[ "${KIBANA_BUILD_ID:-}" != "false" ]]; then
  cd "$WORKSPACE"

  if [[ ! -d "$KIBANA_BUILD_LOCATION/bin" ]]; then
    echo '--- Downloading Stateful Distribution'
    download_artifact kibana-default.tar.gz . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
    mkdir -p "$KIBANA_BUILD_LOCATION"
    tar -xzf kibana-default.tar.gz -C "$KIBANA_BUILD_LOCATION" --strip=1
  fi

  if [[ ! -d "$KIBANA_SERVERLESS_BUILD_LOCATION/bin" ]]; then
    echo '--- Downloading Serverless Distribution'
    download_artifact kibana-serverless.tar.gz . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
    mkdir -p "$KIBANA_SERVERLESS_BUILD_LOCATION"
    tar -xzf kibana-serverless.tar.gz -C "$KIBANA_SERVERLESS_BUILD_LOCATION" --strip=1
  fi

  if is_pr_with_label "ci:build-example-plugins"; then
    # Testing against an example plugin distribution is not supported,
    # mostly due to snapshot failures when testing UI element lists
    rm -rf "$KIBANA_BUILD_LOCATION/plugins"
    mkdir "$KIBANA_BUILD_LOCATION/plugins"
    rm -rf "$KIBANA_SERVERLESS_BUILD_LOCATION/plugins"
    mkdir "$KIBANA_SERVERLESS_BUILD_LOCATION/plugins"
  fi

  cd "$KIBANA_DIR"
fi
