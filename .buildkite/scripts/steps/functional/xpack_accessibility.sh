#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

cd "$XPACK_DIR"

echo --- Default Accessibility Tests

checks-reporter-with-killswitch "X-Pack accessibility tests" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config test/accessibility/config.ts
