#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# TODO remove ts refs if possible
echo --- Build TS Refs
checks-reporter-with-killswitch "Build TS Refs" \
  node scripts/build_ts_refs \
    --clean \
    --no-cache \
    --force

echo --- Check Types
cat target/check_types.log
