#!/bin/bash

set -euo pipefail

# Quietly upload the cache-warmup step before everything else,
# in order to run it sooner than others, and have a warm cache by the time other steps run.
(buildkite-agent pipeline upload .buildkite/pipelines/pull_request/store_moon_cache.yml > /dev/null \
 && echo "Uploaded cache-warmup step" >&2) || echo "Failed to upload cache-warmup step" >&2

# Resolve kbn-moon's transitive npm deps (hjson, js-yaml, lodash) from .buildkite/node_modules
# instead of requiring a full Kibana bootstrap. --transpile-only skips TS module resolution
# (which doesn't honour NODE_PATH) and defers to Node's runtime resolver.
set +e
NODE_PATH="$(pwd)/.buildkite/node_modules" ts-node --transpile-only \
  .buildkite/scripts/pipelines/pull_request/pipeline.ts
pipeline_status=$?

if [[ $pipeline_status -ne 0 ]]; then
  echo "⚠️ Pipeline generation failed - emitting bogus pipeline to ensure build fails" >&2
  echo "boom"
  exit 1
fi

echo "Pipeline generation successful" >&2
exit 0