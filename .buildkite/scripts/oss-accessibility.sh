#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export JOB=kibana-oss-accessibility

.buildkite/scripts/bootstrap.sh

echo '--- Downloading Distribution and Plugin artifacts'

cd "$WORKSPACE"

buildkite-agent artifact download kibana-oss.tar.gz .
buildkite-agent artifact download kibana-oss-plugins.tar.gz .

mkdir -p "$KIBANA_OSS_BUILD_LOCATION"
tar -xzf kibana-oss.tar.gz -C "$KIBANA_OSS_BUILD_LOCATION" --strip=1

cd "$KIBANA_DIR"

tar -xzf ../kibana-oss-plugins.tar.gz

echo "--- Running $JOB"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_OSS_BUILD_LOCATION" \
  --config test/accessibility/config.ts
