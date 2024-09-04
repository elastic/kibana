#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/common/util.sh

echo "--- Fetch the latest successful build in 'kibana-on-merge' pipeline"
JSON_OUTPUT=$(ts-node "$(dirname "${0}")/last_successful_build.ts")

KIBANA_BUILD_ID=$(echo $JSON_OUTPUT | jq -r '.buildId')
BUILD_NUMBER=$(echo $JSON_OUTPUT | jq -r '.buildNumber')
COMMIT_HASH=$(echo $JSON_OUTPUT | jq -r '.status')

echo "KIBANA_BUILD_ID: $KIBANA_BUILD_ID"
echo "BUILD_NUMBER: $BUILD_NUMBER"
echo "COMMIT_HASH: $COMMIT_HASH"

echo "--- Set commit-hash in meta-data"
buildkite-agent meta-data set "commit-hash" "$COMMIT_HASH"

export KIBANA_BUILD_ID

.buildkite/scripts/download_build_artifacts.sh

echo "--- Upload Existing Artifacts"
cd "$WORKSPACE"
buildkite-agent artifact upload "./*.tar.gz"

# .buildkite/scripts/build_kibana.sh
# .buildkite/scripts/build_kibana_plugins.sh
# .buildkite/scripts/post_build_kibana_plugins.sh
#.buildkite/scripts/post_build_kibana.sh
