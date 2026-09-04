#!/bin/bash

set -euo pipefail

# Quietly upload the cache-warmup step before everything else,
# in order to run it sooner than others, and have a warm cache by the time other steps run.
(buildkite-agent pipeline upload .buildkite/pipelines/pull_request/store_moon_cache.yml > /dev/null \
 && echo "Uploaded cache-warmup step" >&2) || echo "Failed to upload cache-warmup step" >&2

# Module graph files are missing from the cone sparse checkout used for upload.
if [[ -f .git/info/sparse-checkout ]]; then
  {
    git sparse-checkout init --no-cone
    git sparse-checkout set --no-cone \
      .buildkite \
      .node-version \
      package.json \
      tsconfig.base.json \
      versions.json \
      kibana.jsonc \
      '**/kibana.jsonc' \
      '**/tsconfig.json'
  } >&2 || echo "Failed to expand sparse checkout for module graph" >&2
fi

ts-node .buildkite/scripts/pipelines/pull_request/pipeline.ts
