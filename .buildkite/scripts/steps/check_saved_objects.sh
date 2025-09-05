#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo "Check changes in Saved Objects"

set_serverless_release_sha

if [[ ! "$GITHUB_SERVERLESS_RELEASE_SHA" ]]; then
  echo "❌ Couldn't determine current serverless release SHA. Aborting Saved Objects checks" >&2
  exit 1
fi

EXISTING_SNAPSHOT_SHA=$(findExistingSnapshotSha $GITHUB_PR_MERGE_BASE)
if [ $? -ne 0 ]; then
  echo "❌ Could not find an existing snapshot to use as a baseline. Aborting Saved Objects checks" >&2
  exit 1
fi

node scripts/check_saved_objects --baseline $EXISTING_SNAPSHOT_SHA --baseline $GITHUB_SERVERLESS_RELEASE_SHA
