#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types

args=()
if [ -n "${RESTORE_ARCHIVE:-}" ]; then
  args+=(--restore-archive)
fi
if [ -n "${UPLOAD_ARCHIVE:-}" ]; then
  args+=(--upload-archive)
fi

node scripts/type_check "${args[@]}"
