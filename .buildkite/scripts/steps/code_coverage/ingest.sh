#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

export CODE_COVERAGE=1
echo "--- Reading Kibana stats cluster creds from vault"
export USER_FROM_VAULT="$(retry 5 5 vault read -field=username secret/kibana-issues/prod/coverage/elasticsearch)"
export PASS_FROM_VAULT="$(retry 5 5 vault read -field=password secret/kibana-issues/prod/coverage/elasticsearch)"
export HOST_FROM_VAULT="$(retry 5 5 vault read -field=host secret/kibana-issues/prod/coverage/elasticsearch)"
export timestamp=$(date +"%Y-%m-%dT%H:%M:00Z")
export TIME_STAMP=${timestamp}

echo "--- Download previous git sha"
.buildkite/scripts/steps/code_coverage/ingest/downloadPrevSha.sh
previousSha=$(cat downloaded_previous.txt)
echo "previousSha = ${previousSha}"

echo "--- Upload new git sha"
.buildkite/scripts/steps/code_coverage/ingest/uploadPrevSha.sh

.buildkite/scripts/bootstrap.sh
#node scripts/build_kibana_platform_plugins.js --no-cache
 
echo "--- Download coverage arctifacts"
buildkite-agent artifact download target/kibana-coverage/jest/* . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
buildkite-agent artifact download target/kibana-coverage/functional/* . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- process HTML Links"
.buildkite/scripts/steps/code_coverage/ingest/prokLinks.sh

echo "--- collect VCS Info"
.buildkite/scripts/steps/code_coverage/ingest/collectVcsInfo.sh

# replace path in json files and generate final reports
echo "--- Replace path in json files"
export COVERAGE_TEMP_DIR=$KIBANA_DIR/target/kibana-coverage
sed -i "s|/opt/local-ssd/buildkite/builds/kb-[[:alnum:]\-]\{20,27\}/elastic/kibana-code-coverage-main/kibana|${KIBANA_DIR}|g" $COVERAGE_TEMP_DIR/jest/*.json
sed -i "s|/opt/local-ssd/buildkite/builds/kb-cigroup-4d-[[:xdigit:]]\{16\}/elastic/kibana-code-coverage-main/kibana|${KIBANA_DIR}|g" $COVERAGE_TEMP_DIR/functional/*.json

echo "--- Jest: merging coverage files and generating the final combined report"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js
rm -rf target/kibana-coverage/jest && mkdir target/kibana-coverage/jest

echo "--- Functional: merging json files and generating the final combined report"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js
rm -rf target/kibana-coverage/functional && mkdir target/kibana-coverage/functional

# archive reports to upload as build artifacts
echo "--- Archive combined jest & functional reports"
tar -czf target/kibana-coverage/jest/kibana-jest-coverage.tar.gz target/kibana-coverage/jest-combined
tar -czf target/kibana-coverage/functional/kibana-functional-coverage.tar.gz target/kibana-coverage/functional-combined

echo "--- Upload coverage static site"
.buildkite/scripts/steps/code_coverage/ingest/uploadStaticSite.sh

echo "--- Ingest results to Kibana stats cluster"
#export NODE_ENV=test

ls -la src/dev/code_coverage/ingest_coverage/team_assignment

.buildkite/scripts/steps/code_coverage/ingest/ingestData.sh 'elastic+kibana+code-coverage' ${BUILDKITE_BUILD_ID} ${BUILDKITE_BUILD_URL} ${previousSha} 'src/dev/code_coverage/ingest_coverage/team_assignment/team_assignments.txt'
