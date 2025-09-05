#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo "Check Saved Object types (Serverless)"

set_serverless_release_sha

if [[ ! "$GITHUB_SERVERLESS_RELEASE_SHA" ]]; then
  echo "Couldn't determine current serverless release SHA. Skipping Saved Objects checks ❌"
  exit 1
fi

git merge-base --is-ancestor $GITHUB_SERVERLESS_RELEASE_SHA $GITHUB_PR_MERGE_BASE

if [$? -ne 0]; then
  echo "The PR branch stems from a commit that is older than the last serverless release."
  echo "Please rebase before merging. Skipping Saved Objects checks ❌"
  exit 1
else
  node scripts/check_saved_object_types $GITHUB_SERVERLESS_RELEASE_SHA
fi
