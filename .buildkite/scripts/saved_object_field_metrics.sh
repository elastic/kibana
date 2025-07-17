#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Default Saved Object Field Metrics'
cd "$XPACK_DIR"
node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config test/saved_objects_field_count/config.ts
