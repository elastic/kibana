#!/usr/bin/env bash

set -euo pipefail

# SO migration comparison lives in the Kibana dev app code, needs bootstrapping
.buildkite/scripts/bootstrap.sh

echo "--- Collecting commit info"
ts-node .buildkite/scripts/serverless/create_deploy_tag/collect_commit_info.ts

if [[ "$AUTO_SELECT_COMMIT" == "true" || "$AUTO_SELECT_COMMIT" == "1" ]]; then
  echo "--- Auto promoting to RC, skipping confirmation"
else
  echo "--- Uploading confirmation step"
  cat << EOF | buildkite-agent pipeline upload
  steps:
    - block: "Confirm deployment"
      prompt: "Are you sure you want to deploy to production? (dry run: ${DRY_RUN:-false})"
      depends_on: collect_data
EOF
fi
