#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

APM_CYPRESS_RECORD_KEY="$(vault_get apm-cypress-dashboard-record-key CYPRESS_RECORD_KEY)"

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh
.buildkite/scripts/copy_es_snapshot_cache.sh

export JOB=kibana-apm-cypress
IS_FLAKY_TEST_RUNNER=${CLI_COUNT:-0}
GH_APM_TEAM_LABEL="Team:APM"

if (! is_pr); then
  echo "--- Add GH labels to buildkite metadata"
  ts-node .buildkite/scripts/steps/add_gh_labels_to_bk_metadata.ts BUILDKITE_MESSAGE true
  GH_ON_MERGE_LABELS="$(buildkite-agent meta-data get gh_labels --default '')"
fi

# Enabling cypress dashboard recording when PR is labeled with `apm:cypress-record` and we are not using the flaky test runner OR on merge with Team:APM label applied
if ([[ "$IS_FLAKY_TEST_RUNNER" -ne 1 ]] && is_pr_with_label "apm:cypress-record") || ([[ $GH_ON_MERGE_LABELS == *"$GH_APM_TEAM_LABEL"* ]]); then
  CYPRESS_ARGS="--record --key "$APM_CYPRESS_RECORD_KEY" --parallel --ci-build-id "${BUILDKITE_BUILD_ID}""
else
  CYPRESS_ARGS=""
fi

echo "--- APM Cypress Tests"

cd "$XPACK_DIR"

node plugins/observability_solution/apm/scripts/test/e2e.js \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  $CYPRESS_ARGS
