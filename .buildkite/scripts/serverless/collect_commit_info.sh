#!/usr/bin/env bash
set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Collecting commit info"
ts-node .buildkite/scripts/serverless/collect_commit_info.ts
