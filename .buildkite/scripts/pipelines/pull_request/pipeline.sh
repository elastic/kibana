#!/bin/bash

set -euo pipefail

if [[ "${GITHUB_PR_LABELS:-}" == *"ci:beta-faster-pr-build"* ]]; then
  # Quietly upload the cache-warmup step before everything else,
  # in order to run it sooner than others, and have a warm cache by the time other steps run.
  (buildkite-agent pipeline upload .buildkite/pipelines/pull_request/store_moon_cache.yml > /dev/null \
   && echo "Uploaded cache-warmup step" >&2) || echo "Failed to upload cache-warmup step" >&2
fi

tmp_pipeline_file="$(mktemp)"
cleanup() {
  rm -f "$tmp_pipeline_file"
}
trap cleanup EXIT

if ! ts-node .buildkite/scripts/pipelines/pull_request/pipeline.ts > "$tmp_pipeline_file"; then
  cat <<'YAML'
steps:
  - label: ':x: PR pipeline generation failed'
    command: |
      echo 'Failed to generate dynamic PR pipeline. See the uploader step logs for details.' >&2
      exit 1
YAML
  exit 0
fi

cat "$tmp_pipeline_file"
