#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export BUILD_TS_REFS_DISABLE=false
.buildkite/scripts/bootstrap.sh

echo '--- Lint: eslint (with types)'
checks-reporter-with-killswitch "Lint: eslint (with types)" \
  node scripts/eslint_with_types
