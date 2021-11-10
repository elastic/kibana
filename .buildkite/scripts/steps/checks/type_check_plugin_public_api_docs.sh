#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Build TS Refs
checks-reporter-with-killswitch "Build TS Refs" \
  node scripts/build_ts_refs \
    --clean \
    --no-cache \
    --force

echo --- Check Types
checks-reporter-with-killswitch "Check Types" \
  node scripts/type_check

echo --- Building api docs
node --max-old-space-size=12000 scripts/build_api_docs
