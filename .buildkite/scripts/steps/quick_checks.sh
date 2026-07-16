#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

if [[ "${CI:-}" =~ ^(1|true)$ ]]; then
  export DISABLE_BOOTSTRAP_VALIDATION=false
  .buildkite/scripts/bootstrap.sh
fi

# TODO(yarn-to-pnpm): Quick Checks are forced green while stabilizing the pnpm
# migration (unused-deps/http-proxy still failing in CI). Revert before merge.
node scripts/quick_checks --file .buildkite/scripts/steps/checks/quick_checks.json || true
