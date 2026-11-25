#!/usr/bin/env bash

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Page Load Bench against Merge Base'
node scripts/perf_page_load.js compare-refs \
  "${GITHUB_PR_MERGE_BASE}" \
  "${BUILDKITE_COMMIT}" \
  --dist \
  --throttle devtools

# For now, exit 0 to avoid blocking the build
exit 0
