#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

source .buildkite/scripts/pipelines/security_solution_quality_gate/prepare_vault_entries.sh

echo "--- Running Entity Store Scout MKI quality gate tests"

cd x-pack/solutions/security/plugins/entity_store/test/scout/api
set +e

node ./scripts/mki_start_scout_execution
cmd_status=$?
echo "Exit code with status: $cmd_status"
exit $cmd_status
