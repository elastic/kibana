#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export CI_GROUP=${CI_GROUP:-$((BUILDKITE_PARALLEL_JOB+1))}
export JOB=kibana-oss-ciGroup${CI_GROUP}

echo "--- OSS CI Group $CI_GROUP"

checks-reporter-with-killswitch "Functional tests / Group ${CI_GROUP}" \
  node scripts/functional_tests \
    --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --include-tag "ciGroup$CI_GROUP"
