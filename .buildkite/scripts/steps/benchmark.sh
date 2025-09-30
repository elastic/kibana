#!/usr/bin/env bash

set -euo pipefail

if [[ "${CI:-}" =~ ^(1|true)$ ]]; then
  export DISABLE_BOOTSTRAP_VALIDATION=false
  .buildkite/scripts/bootstrap.sh
fi

echo "--- node scripts/bench.js"

node scripts/bench.js \
  --left ${BASE_COMMIT:-6ee90f0983e226d795d17125d9cb17213a73f1be} \
  --right ${CHANGE_COMMIT:-098e99cad5a2414dc57f8c4e6fe07fe611f0d9b5} \
  --config src/platform/packages/shared/kbn-jest-benchmarks/benchmark.config.ts
