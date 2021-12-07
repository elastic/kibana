#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

cd "$XPACK_DIR"

echo --- Default Firefox Smoke Tests

checks-reporter-with-killswitch "X-Pack firefox smoke test" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --include-tag "includeFirefox" \
    --config test/functional/config.firefox.js \
    --config test/functional_embedded/config.firefox.ts
