#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export MOON_CACHE=write
.buildkite/scripts/bootstrap.sh
echo "--- Archive moon cache"
if [[ ! -d .moon/cache ]]; then
  echo "No moon cache directory found, skipping archive"
  exit 0
else
  tar -czf ~/moon-cache.tar.gz .moon/cache || echo "Failed to archive moon cache"
  cd ~/
  buildkite-agent artifact upload moon-cache.tar.gz || echo "Failed to upload moon cache"
  echo "Moon cache archived as moon-cache.tar.gz"
fi
