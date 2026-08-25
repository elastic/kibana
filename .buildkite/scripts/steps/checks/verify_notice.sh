#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Verify NOTICE

if is_pr && ! is_auto_commit_disabled; then
  node scripts/notice
  check_for_changed_files "node scripts/notice" true
else
  node scripts/notice --validate
fi
