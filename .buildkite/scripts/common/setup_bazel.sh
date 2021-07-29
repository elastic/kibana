#!/usr/bin/env bash

KIBANA_BUILDBUDDY_CI_API_KEY=$(vault read -field=value secret/kibana-issues/dev/kibana-buildbuddy-ci-api-key)
export KIBANA_BUILDBUDDY_CI_API_KEY

cp "$KIBANA_DIR/src/dev/ci_setup/.bazelrc-ci" "$HOME/.bazelrc"

###
### append auth token to buildbuddy into "$HOME/.bazelrc";
###
echo "# Appended by .buildkite/scripts/setup_bazel.sh" >> "$HOME/.bazelrc"
echo "build --remote_header=x-buildbuddy-api-key=$KIBANA_BUILDBUDDY_CI_API_KEY" >> "$HOME/.bazelrc"

###
### remove write permissions on buildbuddy remote cache for prs
###
if [[ "${BUILDKITE_PULL_REQUEST:-}" && "$BUILDKITE_PULL_REQUEST" != "false" ]] ; then
  {
    echo "# Uploads logs & artifacts without writing to cache"
    echo "build --noremote_upload_local_results"
  } >> "$HOME/.bazelrc"
fi
