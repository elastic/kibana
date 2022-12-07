#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check TypeScript Projects
cmd="node scripts/check_ts_projects"
if is_pr && ! is_auto_commit_disabled; then
  cmd="$cmd --fix"
fi

eval "$cmd"
check_for_changed_files "$cmd" true
