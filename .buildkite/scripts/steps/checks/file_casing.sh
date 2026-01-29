#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check File Casing

# This check supports QUICK_CHECK_TARGET_FILES env var for file-level filtering
if [[ -n "${QUICK_CHECK_TARGET_FILES:-}" ]]; then
  echo "Scoping file casing check to specified files"
fi

node scripts/check_file_casing --quiet
