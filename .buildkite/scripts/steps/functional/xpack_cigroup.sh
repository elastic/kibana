#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export CI_GROUP=${CI_GROUP:-$((BUILDKITE_PARALLEL_JOB+1))}
export JOB=kibana-default-ciGroup${CI_GROUP}

echo "--- Default CI Group $CI_GROUP"

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo "--- Running $JOB"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "X-Pack Chrome Functional tests / Group ${CI_GROUP}" \
  node scripts/functional_tests \
    --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --include-tag "ciGroup$CI_GROUP"

cd "$KIBANA_DIR"
