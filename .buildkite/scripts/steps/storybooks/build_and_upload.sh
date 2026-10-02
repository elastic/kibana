#!/usr/bin/env bash

set -euo pipefail

if [[ "${BUILDKITE_PULL_REQUEST:-false}" == "false" ]]; then
  # Storybooks published from trusted builds use freshly built shared webpack bundles, not remote-cache hits
  export KBN_BOOTSTRAP_NO_PREBUILT=true
  .buildkite/scripts/bootstrap.sh
  pnpm kbn build-shared --no-cache
else
  .buildkite/scripts/bootstrap.sh
fi

ts-node .buildkite/scripts/steps/storybooks/build_and_upload.ts
