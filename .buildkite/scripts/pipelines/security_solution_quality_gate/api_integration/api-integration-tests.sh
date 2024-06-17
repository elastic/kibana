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
TARGET_SCRIPT=$1 node .buildkite/scripts/pipelines/security_solution_quality_gate/api_integration/start_api_ftr_execution
cmd_status=$?
echo "Exit code with status: $cmd_status"
exit $cmd_status
