#!/usr/bin/env bash

set -euo pipefail

if [[ "${CI:-}" =~ ^(1|true)$ ]]; then
  export DISABLE_BOOTSTRAP_VALIDATION=false
  .buildkite/scripts/bootstrap.sh
fi

node scripts/bench.js
  --left ${BASE_COMMIT:-31984a26989850bba91e8e6308429b5b4cf99e01}
  --right ${CHANGE_COMMIT:-11c560cc801b0302867d0a7e5718876e7a66369b}
  --config src/platform/packages/shared/kbn-jest-benchmarks/benchmark.config.ts
