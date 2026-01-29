#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check i18n

# If target packages are specified, only check those packages
if [[ -n "${QUICK_CHECK_TARGET_PACKAGES:-}" ]]; then
  echo "Scoping i18n check to packages: ${QUICK_CHECK_TARGET_PACKAGES}"
  # Convert comma-separated list to multiple --path arguments
  IFS=',' read -ra PACKAGES <<< "$QUICK_CHECK_TARGET_PACKAGES"
  PATH_ARGS=""
  for pkg in "${PACKAGES[@]}"; do
    PATH_ARGS="$PATH_ARGS --path ./$pkg"
  done
  eval "node scripts/i18n_check --quiet $PATH_ARGS"
else
  node scripts/i18n_check --quiet
fi
