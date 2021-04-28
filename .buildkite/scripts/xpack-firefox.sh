#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export JOB=kibana-default-firefox

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo "--- Running Firefox smoke tests"

cd "$XPACK_DIR"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --include-tag "includeFirefox" \
  --config test/functional/config.firefox.js \
  --config test/functional_embedded/config.firefox.ts
