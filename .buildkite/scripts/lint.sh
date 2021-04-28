#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
node scripts/stylelint

echo '--- Lint: eslint'
node scripts/eslint --no-cache
