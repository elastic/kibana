#!/usr/bin/env bash

set -euo pipefail

COVERAGE_JOB_NAME=$1
export COVERAGE_JOB_NAME
echo "### debug COVERAGE_JOB_NAME: ${COVERAGE_JOB_NAME}"

BUILD_ID=$2
export BUILD_ID

CI_RUN_URL=$3
export CI_RUN_URL
echo "### debug CI_RUN_URL: ${CI_RUN_URL}"

FETCHED_PREVIOUS=$4
export FETCHED_PREVIOUS
echo "### debug FETCHED_PREVIOUS: ${FETCHED_PREVIOUS}"

ES_HOST="https://${USER_FROM_VAULT}:${PASS_FROM_VAULT}@${HOST_FROM_VAULT}"
export ES_HOST

STATIC_SITE_URL_BASE='https://kibana-coverage.elastic.dev'
export STATIC_SITE_URL_BASE

TEAM_ASSIGN_PATH=$5
echo "### debug TEAM_ASSIGN_PATH: ${TEAM_ASSIGN_PATH}"

BUFFER_SIZE=500
export BUFFER_SIZE

annotateForKibanaLinks() {
  local currentBuildNumber="$BUILDKITE_BUILD_NUMBER"
  local coverageUrl="https://kibana-stats.elastic.dev/app/discover#/?_g=(filters:!(),query:(language:kuery,query:''),refreshInterval:(pause:!t,value:0),time:(from:now-7d,to:now))&_a=(columns:!(),filters:!(),hideChart:!f,index:'64419790-4218-11ea-b2d8-81bcbf78dfcb',interval:auto,query:(language:kuery,query:'BUILD_ID%20:%20${currentBuildNumber}'),sort:!(!('@timestamp',desc)))"
  local totalCoverageUrl="https://kibana-stats.elastic.dev/app/discover#/?_g=(filters:!(),query:(language:kuery,query:''),refreshInterval:(pause:!t,value:0),time:(from:now-7d,to:now))&_a=(columns:!(),filters:!(),hideChart:!f,index:d78f9120-4218-11ea-b2d8-81bcbf78dfcb,interval:auto,query:(language:kuery,query:'BUILD_ID%20:%20${currentBuildNumber}'),sort:!(!('@timestamp',desc)))"

  cat <<EOF | buildkite-agent annotate --style "info" --context 'ctx-kibana-links'
### Browse the following url(s) to visually verify in Kibana

_Links are pinned to the current build number._

  - [Code Coverage]($coverageUrl)
  - [Total Code Coverage]($totalCoverageUrl)

EOF

}

ingestModular() {
  local xs=("$@")

  echo "--- Generate Team Assignments"
  CI_STATS_DISABLED=true node scripts/generate_team_assignments.js \
    --verbose --src '.github/CODEOWNERS' --dest "$TEAM_ASSIGN_PATH"

  echo "--- Ingest results to Kibana stats cluster"
  for x in "${xs[@]}"; do
    echo "--- Ingesting coverage for ${x}"

    COVERAGE_SUMMARY_FILE="target/kibana-coverage/${x}-combined/coverage-summary.json"

    CI_STATS_DISABLED=true node scripts/ingest_coverage.js --path "${COVERAGE_SUMMARY_FILE}" \
      --vcsInfoPath ./VCS_INFO.txt --teamAssignmentsPath "$TEAM_ASSIGN_PATH" &
  done
  wait

  echo "---  Ingesting Code Coverage - Complete"
  echo ""
}
