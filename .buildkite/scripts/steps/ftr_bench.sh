#!/usr/bin/env bash

# set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/setup_es_snapshot_cache.sh

export KBN_PROFILER_SAMPLING_INTERVAL=10000

echo '--- FTR Bench against Merge Base'
node scripts/bench.js --config src/platform/packages/shared/kbn-ftr-benchmarks/benchmark.config.ts --left "${GITHUB_PR_MERGE_BASE}" --right "${BUILDKITE_COMMIT}" --profile --debug --config-from-cwd

# For now, exit 0 to avoid blocking the build
exit 0
