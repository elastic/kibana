#!/usr/bin/env bash

set -euo pipefail

if [[ "${BUILDKITE_PULL_REQUEST:-false}" == "false" ]]; then
  # build_and_upload.ts builds the shared bundles; skip the moon-cache download.
  export KBN_BOOTSTRAP_NO_PREBUILT=true
  .buildkite/scripts/bootstrap.sh
else
  .buildkite/scripts/bootstrap.sh
fi

node .buildkite/scripts/steps/storybooks/build_and_upload.ts
