#!/usr/bin/env bash

set -euo pipefail

# Skip building shared webpack bundles during bootstrap because
# node scripts/build rebuilds them in production mode with --dist
export KBN_BOOTSTRAP_NO_PREBUILT=true

source .buildkite/scripts/common/util.sh

EXPECTED_TYPE="rspack"
if [[ "${KBN_USE_RSPACK:-}" == "false" || "${KBN_USE_RSPACK:-}" == "0" ]]; then
  EXPECTED_TYPE="legacy"
fi

# [rspack-transition] Validate cached build type before reusing.
# When the legacy optimizer is removed, delete this block and restore the
# if: condition in base.yml to skip the build step entirely when a cache hit exists.
if [[ "${KIBANA_BUILD_ID:-}" && "$KIBANA_BUILD_ID" != "$BUILDKITE_BUILD_ID" ]]; then
  CACHED_TYPE="legacy"
  if download_artifact "kibana-build-type.txt" . --build "$KIBANA_BUILD_ID" 2>/dev/null; then
    CACHED_TYPE=$(cat kibana-build-type.txt)
  fi

  if [[ "$CACHED_TYPE" == "$EXPECTED_TYPE" ]]; then
    echo "--- Reusing cached $CACHED_TYPE build from $KIBANA_BUILD_ID"
    buildkite-agent meta-data set "kibana-effective-build-id" "$KIBANA_BUILD_ID"
    exit 0
  fi

  echo "--- Cached build type ($CACHED_TYPE) doesn't match expected ($EXPECTED_TYPE). Building fresh."
fi

.buildkite/scripts/bootstrap.sh

.buildkite/scripts/build_kibana.sh
.buildkite/scripts/post_build_kibana.sh

# Record this build as the effective build for downstream steps
buildkite-agent meta-data set "kibana-effective-build-id" "$BUILDKITE_BUILD_ID"
