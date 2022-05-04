#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Default Saved Object Field Metrics'
checks-reporter-with-killswitch "Capture Kibana Saved Objects field count metrics" \
  node scripts/functional_tests \
      --debug --bail \
      --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
      --config x-pack/test/saved_objects_field_count/config.ts
