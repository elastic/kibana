#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: eslint (with types)'
export NODE_OPTIONS='--max-old-space-size=8192'

if is_pr && ! is_auto_commit_disabled; then
  node scripts/eslint_with_types --fix
  check_for_changed_files "node scripts/eslint_with_types" true
else
  node scripts/eslint_with_types
fi

echo "eslint_with_types ✅"
