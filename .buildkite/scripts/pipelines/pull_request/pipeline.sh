#!/bin/bash

set -euo pipefail

# Quietly upload the cache-warmup step before everything else,
# in order to run it sooner than others, and have a warm cache by the time other steps run.
(buildkite-agent pipeline upload .buildkite/pipelines/pull_request/store_moon_cache.yml > /dev/null \
 && echo "Uploaded cache-warmup step" >&2) || echo "Failed to upload cache-warmup step" >&2

# Upload Build Kibana Distribution early so its agent starts provisioning
# immediately, in parallel with the dynamic pipeline generation below.
(buildkite-agent pipeline upload .buildkite/pipelines/pull_request/early_steps.yml > /dev/null \
 && echo "Uploaded early critical-path steps" >&2) || echo "Failed to upload early critical-path steps" >&2

ts-node .buildkite/scripts/pipelines/pull_request/pipeline.ts
