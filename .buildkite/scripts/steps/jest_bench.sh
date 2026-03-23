#!/usr/bin/env bash

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Jest Bench against Merge Base'
node scripts/bench.js --config src/platform/packages/shared/kbn-jest-benchmarks/benchmark.config.ts --left "${GITHUB_PR_MERGE_BASE}" --right "${BUILDKITE_COMMIT}" --profile --debug --config-from-cwd

# For now, exit 0 to avoid blocking the build
exit 0
