#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

KIBANA_BUILD_ID=$(ts-node "$(dirname "${0}")/last_successful_build.ts")

echo "...${KIBANA_BUILD_ID}..."
export KIBANA_BUILD_ID


# if [[ "${KIBANA_BUILD_ID:-}" != "false" ]]; then
#   if [[ ! -d "$KIBANA_BUILD_LOCATION/bin" ]]; then
#     echo '--- Downloading Distribution and Plugin artifacts'

#     cd "$WORKSPACE"

#     download_artifact kibana-default.tar.gz . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
#     download_artifact kibana-default-plugins.tar.gz . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

#     mkdir -p "$KIBANA_BUILD_LOCATION"
#     tar -xzf kibana-default.tar.gz -C "$KIBANA_BUILD_LOCATION" --strip=1

#     if is_pr_with_label "ci:build-example-plugins"; then
#       # Testing against an example plugin distribution is not supported,
#       # mostly due to snapshot failures when testing UI element lists
#       rm -rf "$KIBANA_BUILD_LOCATION/plugins"
#       mkdir "$KIBANA_BUILD_LOCATION/plugins"
#     fi

#     cd "$KIBANA_DIR"

#     tar -xzf ../kibana-default-plugins.tar.gz
#   fi
# fi

# .buildkite/scripts/build_kibana.sh
# .buildkite/scripts/build_kibana_plugins.sh
# .buildkite/scripts/post_build_kibana_plugins.sh
# .buildkite/scripts/post_build_kibana.sh
