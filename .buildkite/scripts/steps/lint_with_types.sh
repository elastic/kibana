#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: eslint (with types)'
export NODE_OPTIONS='--max-old-space-size=8192'
node scripts/eslint_with_types
