#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export CI_GROUP=3
export JOB=kibana-default-ciGroup${CI_GROUP}

echo "--- Default CI Group $CI_GROUP"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "X-Pack Chrome Functional tests / Group ${CI_GROUP}" \
  node scripts/functional_tests \
    --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config "test/functional/config.js" \
    --include-tag "ciGroup$CI_GROUP"

cd "$KIBANA_DIR"
