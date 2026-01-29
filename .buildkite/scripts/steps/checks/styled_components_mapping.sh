#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check styled-components mapping

# Build files argument if target files are specified
FILES_ARG=""
if [[ -n "${QUICK_CHECK_TARGET_FILES:-}" ]]; then
  FILES_ARG="--files ${QUICK_CHECK_TARGET_FILES}"
fi

cmd="node scripts/styled_components_mapping"
eval "$cmd $FILES_ARG"
check_for_changed_files "$cmd" true
