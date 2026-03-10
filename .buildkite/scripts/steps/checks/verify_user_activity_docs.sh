#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Verify user activity docs

if ! is_pr; then
  echo "Not a PR build, skipping."
  exit 0
fi

node scripts/generate user-activity-actions-docs
check_for_changed_files "node scripts/generate user-activity-actions-docs" true "Update user activity docs"