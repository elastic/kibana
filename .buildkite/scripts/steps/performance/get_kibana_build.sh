#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/common/util.sh

echo "--- Fetch the latest successful build in 'kibana-on-merge' pipeline"
KIBANA_BUILD_ID=$(ts-node "$(dirname "${0}")/last_successful_build.ts")

echo "Using build artifacts from kibana-on-merge pipeline, build id: $KIBANA_BUILD_ID"
export KIBANA_BUILD_ID

.buildkite/scripts/download_build_artifacts.sh

echo "--- Upload Existing Artifacts"
buildkite-agent artifact upload "./*.tar.gz;./*.zip;./*.deb;./*.rpm"

# .buildkite/scripts/build_kibana.sh
# .buildkite/scripts/build_kibana_plugins.sh
# .buildkite/scripts/post_build_kibana_plugins.sh
#.buildkite/scripts/post_build_kibana.sh
