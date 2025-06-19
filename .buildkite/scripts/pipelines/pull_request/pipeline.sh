#!/bin/bash

set -euo pipefail

if [[ "$(echo $GITHUB_PR_LABELS | grep 'use-qa-image')" != ""]]; then
  ts-node .buildkite/scripts/pipelines/pull_request/pipeline-next.ts
else
  ts-node .buildkite/scripts/pipelines/pull_request/pipeline.ts
fi
