#!/bin/bash

set -euo pipefail

if [ -z "$1" ]
  then
    echo "No target script from the package.json file, is supplied"
    exit 1
fi

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

export JOB=kibana-defend-workflows-osquery-serverless-cypress

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

source .buildkite/scripts/pipelines/security_solution_quality_gate/prepare_vault_entries.sh

cd x-pack/platform/plugins/shared/osquery
set +e

export BK_ANALYTICS_API_KEY=$(vault_get security-solution-quality-gate serverless-cypress-defend-workflows)

echo "--- Running the tests for target $1"
BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn $1
status=$?
yarn junit:merge || :

if [[ -n "${PARENT_TRIGGER_JOB_ID:-}" ]] && [[ "$status" -eq 101 ]]; then
  echo "--- PROJECT_INIT_TIMEOUT_EXIT_CODE captured"
  buildkite-agent meta-data set "mki_project_init_timeout_occurred" "true" \
    --job "$PARENT_TRIGGER_JOB_ID" || true
fi

exit "$status"
