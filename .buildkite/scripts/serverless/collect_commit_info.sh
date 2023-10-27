#!/usr/bin/env bash
set -euo pipefail

# SO migration comparison lives in the Kibana dev app code, needs bootstrapping
.buildkite/scripts/bootstrap.sh

echo "--- Collecting commit info"
ts-node .buildkite/scripts/serverless/collect_commit_info.ts
