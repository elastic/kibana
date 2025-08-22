#!/usr/bin/env bash
set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Security: check 3rd-party dependencies'

if is_pr && ! is_auto_commit_disabled; then
  ts-node .buildkite/scripts/steps/security/dependencies_diff.ts
fi

check_for_changed_files "security: 3rd-party dependencies" true

echo "security: check 3rd-party dependencies ✅"