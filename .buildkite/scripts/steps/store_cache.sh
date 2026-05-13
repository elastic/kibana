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
  tar -cf ~/moon-cache.tar.zst -I 'zstd -19 -T0' .moon/cache || echo "Failed to archive moon cache"
  cd ~/
  buildkite-agent artifact upload moon-cache.tar.zst || echo "Failed to upload moon cache"
  echo "Moon cache archived as moon-cache.tar.zst"
fi
