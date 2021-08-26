#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo --- OSS Accessibility Tests

checks-reporter-with-killswitch "Kibana accessibility tests" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config test/accessibility/config.ts
