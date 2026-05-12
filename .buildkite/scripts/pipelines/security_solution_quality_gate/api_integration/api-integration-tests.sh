#!/bin/bash
if [ -z "$1" ]
  then
    echo "No target script from the package.json file, is supplied"
    exit 1
fi

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

source .buildkite/scripts/pipelines/security_solution_quality_gate/prepare_vault_entries.sh

echo "--- Running test script $1"

cd x-pack/solutions/security/test/security_solution_api_integration
set +e

TARGET_SCRIPT=$1 node ./scripts/mki_start_api_ftr_execution
cmd_status=$?

echo "--- BUILDKITE_JOB_ID: ${BUILDKITE_JOB_ID}"
echo "--- BUILDKITE_TRIGGERED_FROM_BUILD_ID: ${BUILDKITE_TRIGGERED_FROM_BUILD_ID}"
echo "--- $status"

if [[ -n "${BUILDKITE_TRIGGERED_FROM_BUILD_ID:-}" ]] && [[ "$cmd_status" -eq 101 ]]; then
  buildkite-agent meta-data set "mki_project_init_timeout_occurred" "true" \
    --job "$BUILDKITE_TRIGGERED_FROM_BUILD_ID" || true
fi

echo "Exit code with status: $cmd_status"
exit "$cmd_status"
