#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true

export JOB=kibana-default-accessibility

.buildkite/scripts/bootstrap.sh

echo '--- Downloading Distribution and Plugin artifacts'

cd "$WORKSPACE"

buildkite-agent artifact download kibana-default.tar.gz .
buildkite-agent artifact download kibana-default-plugins.tar.gz .

mkdir -p "$KIBANA_BUILD_LOCATION"
tar -xzf kibana-default.tar.gz -C "$KIBANA_BUILD_LOCATION" --strip=1

cd "$KIBANA_DIR"

tar -xzf ../kibana-default-plugins.tar.gz

echo "--- Running $JOB"

cd "$XPACK_DIR"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --config test/accessibility/config.ts
