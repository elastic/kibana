#!/usr/bin/env bash

set -euo pipefail

if [[ "${BUILDKITE_PULL_REQUEST:-false}" == "false" ]]; then
  # Shared bundles are built below; skip the moon-cache download.
  export KBN_BOOTSTRAP_NO_PREBUILT=true
  .buildkite/scripts/bootstrap.sh
  pnpm kbn build-shared --no-cache
else
  .buildkite/scripts/bootstrap.sh
fi

node .buildkite/scripts/steps/storybooks/build_and_upload.ts
