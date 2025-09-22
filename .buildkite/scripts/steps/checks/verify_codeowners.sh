#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Verify CODEOWNERS

if is_pr && ! is_auto_commit_disabled; then
  node scripts/generate codeowners
  check_for_changed_files "node scripts/generate codeowners" true
fi
