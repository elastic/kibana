#!/usr/bin/env bash

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

# [rspack-transition] Forward KBN_USE_RSPACK when the rspack optimizer label is present
is_pr_with_label "ci:build-with-rspack-optimizer" && export KBN_USE_RSPACK=true

echo '--- Page Load Bench against Merge Base'
node scripts/perf_page_load.js compare-refs \
  "${GITHUB_PR_MERGE_BASE}" \
  "${BUILDKITE_COMMIT}" \
  --dist \
  --throttle devtools

# For now, exit 0 to avoid blocking the build
exit 0
