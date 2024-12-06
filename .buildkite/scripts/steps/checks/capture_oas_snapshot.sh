#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/copy_es_snapshot_cache.sh

echo --- Capture OAS snapshot
cmd="node scripts/capture_oas_snapshot --include-path /api/status --include-path /api/alerting/rule/ --include-path /api/alerting/rules --include-path /api/actions --include-path /api/security/role --include-path /api/spaces --include-path /api/fleet --include-path /api/dashboards"
if is_pr && ! is_auto_commit_disabled; then
  cmd="$cmd --update"
fi

if [[ $BUILDKITE_PULL_REQUEST != "false" && "$BUILDKITE_PULL_REQUEST_BASE_BRANCH" != "main" ]] || [[ $BUILDKITE_PULL_REQUEST == "false" && "$BUILDKITE_BRANCH" != "main" ]]; then
  cmd="$cmd --no-serverless"
fi

run_check() {
  eval "$cmd"
}

retry 5 15 run_check

check_for_changed_files "$cmd" true

.buildkite/scripts/steps/openapi_bundling/security_solution_openapi_bundling.sh
.buildkite/scripts/steps/openapi_bundling/final_merge.sh
