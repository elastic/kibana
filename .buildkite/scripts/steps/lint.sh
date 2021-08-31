#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
checks-reporter-with-killswitch "Lint: stylelint" \
  node scripts/stylelint

echo '--- Lint: eslint'
checks-reporter-with-killswitch "Lint: eslint" \
  node scripts/eslint --no-cache
