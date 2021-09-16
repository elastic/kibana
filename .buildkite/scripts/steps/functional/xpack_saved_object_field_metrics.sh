#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

cd "$XPACK_DIR"

echo --- Capture Kibana Saved Objects field count metrics
checks-reporter-with-killswitch "Capture Kibana Saved Objects field count metrics" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config test/saved_objects_field_count/config.ts;
