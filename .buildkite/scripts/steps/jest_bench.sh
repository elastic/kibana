#!/usr/bin/env bash

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Jest Bench against Merge Base'
node scripts/bench.js --config src/platform/packages/shared/kbn-jest-benchmarks/benchmark.config.ts --right "${GITHUB_PR_MERGE_BASE}" --profile --runs 2 --debug

# Always exit 0 to avoid blocking the build
exit 0
