#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true

export CI_GROUP=${CI_GROUP:-$BUILDKITE_PARALLEL_JOB}
export JOB=kibana-default-ciGroup${CI_GROUP}

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo "--- Running $JOB"

cd "$XPACK_DIR"

node scripts/functional_tests \
  --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --include-tag "ciGroup$CI_GROUP"

cd "$KIBANA_DIR"
buildkite-agent artifact upload target/test_metadata.json || true
