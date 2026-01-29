#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Verify NOTICE

# Build files argument if target files are specified
FILES_ARG=""
if [[ -n "${QUICK_CHECK_TARGET_FILES:-}" ]]; then
  FILES_ARG="--files ${QUICK_CHECK_TARGET_FILES}"
fi

if is_pr && ! is_auto_commit_disabled; then
  eval "node scripts/notice $FILES_ARG"
  check_for_changed_files "node scripts/notice" true
else
  eval "node scripts/notice --validate $FILES_ARG"
fi
