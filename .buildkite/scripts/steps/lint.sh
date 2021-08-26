#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

# TODO linting

echo '--- Lint: stylelint'
node scripts/stylelint

echo '--- Lint: eslint'
node scripts/eslint --no-cache
