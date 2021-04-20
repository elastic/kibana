#!/usr/bin/env bash

set -euo pipefail

# source "$(dirname "${0}")/env.sh"

# export BUILD_TS_REFS_CACHE_ENABLE=true
export DISABLE_BOOTSTRAP_VALIDATION=true

export CI_GROUP=${CI_GROUP:-$(( BUILDKITE_PARALLEL_JOB + 1))}
export JOB=kibana-default-ciGroup${CI_GROUP}

echo '--- Bootstrap'
.buildkite/scripts/bootstrap.sh

echo '--- Downloading Distribution and Plugin artifacts'

cd "$WORKSPACE"

buildkite-agent artifact download kibana-default.tar.gz .
buildkite-agent artifact download kibana-default-plugins.tar.gz .

mkdir -p "$KIBANA_BUILD_LOCATION"
tar -xvf kibana-default.tar.gz -C "$KIBANA_BUILD_LOCATION"

cd "$KIBANA_DIR"

tar -xvf ../kibana-default-plugins.tar.gz

echo "--- Running $JOB"

cd "$XPACK_DIR"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --include-tag "ciGroup$CI_GROUP"
