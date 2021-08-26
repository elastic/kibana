#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

# TODO linting

echo '--- Lint: stylelint'
node scripts/stylelint

echo '--- Lint: eslint'
node scripts/eslint --no-cache
