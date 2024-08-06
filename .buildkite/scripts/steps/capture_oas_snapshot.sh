#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Capture OAS snapshot
cmd="node scripts/capture_oas_snapshot --include-path /api/status --include-path /api/alerting/rule/ --include-path /api/alerting/rules"
if is_pr && ! is_auto_commit_disabled; then
  cmd="$cmd --update"
fi

eval "$cmd"
check_for_changed_files "$cmd" true