#!/usr/bin/env bash

set -euo pipefail

KIBANA_BUILD_ID="524c2502-ebb2-4763-9188-2d49b8f7211d"

if [[ ! -d "$KIBANA_BUILD_LOCATION/bin" ]]; then
  echo '--- Downloading Distribution and Plugin artifacts'

  cd "$WORKSPACE"

  buildkite-agent artifact download kibana-default.tar.gz . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  buildkite-agent artifact download kibana-default-plugins.tar.gz . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

  mkdir -p "$KIBANA_BUILD_LOCATION"
  tar -xzf kibana-default.tar.gz -C "$KIBANA_BUILD_LOCATION" --strip=1

  cd "$KIBANA_DIR"

  tar -xzf ../kibana-default-plugins.tar.gz
fi
