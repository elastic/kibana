#!/usr/bin/env bash

set -euo pipefail

echo "### Ingesting Code Coverage"
echo ""

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
echo "### debug BUFFER_SIZE: ${BUFFER_SIZE}"

# Build team assignments file
CI_STATS_DISABLED=true node scripts/generate_team_assignments.js --verbose --src '.github/CODEOWNERS' --dest $TEAM_ASSIGN_PATH

for x in functional jest; do
  echo "### Ingesting coverage for ${x}"
  COVERAGE_SUMMARY_FILE=target/kibana-coverage/${x}-combined/coverage-summary.json
  head -50 ${COVERAGE_SUMMARY_FILE}
  # running in background to speed up ingestion
  COVERAGE_PEEK=true \
    COVERAGE_PEEK_SIZE=4 \
    CI_STATS_DISABLED=true \
    node scripts/ingest_coverage.js \
      --verbose \
      --path ${COVERAGE_SUMMARY_FILE} \
      --vcsInfoPath ./VCS_INFO.txt \
      --teamAssignmentsPath $TEAM_ASSIGN_PATH > ${x}-ingestion.txt &
done
wait

for x in functional jest; do
  echo "### ${x}-ingestion.txt Contents:"
  cat ${x}-ingestion.txt
  echo ""
done


echo "### Ingesting Code Coverage - Complete"
echo ""
