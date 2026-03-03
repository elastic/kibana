#!/usr/bin/env bash

set -euo pipefail

# If cached snapshots are baked into the agent, move them into our workspace first
# We are doing this rather than simply changing the ES base path because many workers
#   run with the workspace mounted in memory or on a local ssd
cacheDir="$ES_CACHE_DIR/cache"
if [[ -d "$cacheDir" ]]; then
  mkdir -p .es/cache
  echo "--- Move ES snapshot cache"
  echo "Moving cached snapshots from $cacheDir to .es/cache"
  mv "$cacheDir"/* .es/cache/
fi
