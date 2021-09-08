#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export CI_GROUP=${CI_GROUP:-$((BUILDKITE_PARALLEL_JOB+1))}
export JOB=kibana-default-ciGroup${CI_GROUP}

echo "--- Default CI Group $CI_GROUP"

cd "$XPACK_DIR"

node scripts/functional_tests \
  --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --include-tag "ciGroup$CI_GROUP"
