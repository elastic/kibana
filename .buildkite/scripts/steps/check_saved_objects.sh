#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo "Check changes in Saved Objects"

set_serverless_release_sha

if [[ ! "$GITHUB_SERVERLESS_RELEASE_SHA" ]]; then
  echo "Couldn't determine current serverless release SHA. Skipping Saved Objects checks ❌"
  exit 1
fi

node scripts/check_saved_objects --baseline $GITHUB_PR_MERGE_BASE --baseline $GITHUB_SERVERLESS_RELEASE_SHA
