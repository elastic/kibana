#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo --- OSS Firefox Smoke Tests

checks-reporter-with-killswitch "Firefox smoke test" \
  node scripts/functional_tests \
    --bail --debug \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --include-tag "includeFirefox" \
    --config test/functional/config.firefox.js
