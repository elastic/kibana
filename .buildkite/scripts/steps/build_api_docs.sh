#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Build TS Refs"
node scripts/build_ts_refs \
  --clean \
  --no-cache \
  --force

echo "--- Build API Docs"
node --max-old-space-size=12000 scripts/build_api_docs
