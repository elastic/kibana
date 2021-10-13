#!/usr/bin/env bash

source .buildkite/scripts/common/util.sh

KIBANA_BUILDBUDDY_CI_API_KEY=$(retry 5 5 vault read -field=value secret/kibana-issues/dev/kibana-buildbuddy-ci-api-key)
export KIBANA_BUILDBUDDY_CI_API_KEY

cp "$KIBANA_DIR/src/dev/ci_setup/.bazelrc-ci" "$KIBANA_DIR/.bazelrc"

###
### append auth token to buildbuddy into "$HOME/.bazelrc";
###
echo "# Appended by .buildkite/scripts/persist_bazel_cache.sh" >> "$KIBANA_DIR/.bazelrc"
echo "build --remote_header=x-buildbuddy-api-key=$KIBANA_BUILDBUDDY_CI_API_KEY" >> "$KIBANA_DIR/.bazelrc"
