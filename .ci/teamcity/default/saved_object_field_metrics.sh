#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-default-savedObjectFieldMetrics
export KIBANA_INSTALL_DIR="$PARENT_DIR/build/kibana-build-default"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Capture Kibana Saved Objects field count metrics" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --config test/saved_objects_field_count/config.ts
