#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
checks-reporter-with-killswitch "Lint: stylelint" \
  node scripts/stylelint

echo '--- Lint: eslint'
checks-reporter-with-killswitch "Lint: eslint" \
  node scripts/eslint --no-cache
