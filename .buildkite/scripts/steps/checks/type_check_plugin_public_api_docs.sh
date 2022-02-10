#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Build TS Refs
checks-reporter-with-killswitch "Build TS Refs" \
  node scripts/build_ts_refs \
    --clean \
    --no-cache \
    --force

set +e;
echo "--- running check types and build api docs in parallel";

checks-reporter-with-killswitch "Check Types" \
  node scripts/type_check &> target/check_types.log &
check_types_pid=$!

node --max-old-space-size=12000 scripts/build_api_docs &> target/build_api_docs.log &
api_docs_pid=$!

wait $check_types_pid
check_types_exit=$?

wait $api_docs_pid
api_docs_exit=$?

echo --- Check Types
cat target/check_types.log
if [[ "$check_types_exit" != "0" ]]; then echo "^^^ +++"; fi

echo --- Building api docs
cat target/build_api_docs.log
if [[ "$api_docs_exit" != "0" ]]; then echo "^^^ +++"; fi

if [[ "${api_docs_exit}${check_types_exit}" != "00" ]]; then
  exit 1
fi
