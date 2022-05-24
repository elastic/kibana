#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/code_coverage/util.sh
source .buildkite/scripts/steps/code_coverage/merge.sh

export CODE_COVERAGE=1
echo "--- Reading Kibana stats cluster creds from vault"
export USER_FROM_VAULT="$(retry 5 5 vault read -field=username secret/kibana-issues/prod/coverage/elasticsearch)"
export PASS_FROM_VAULT="$(retry 5 5 vault read -field=password secret/kibana-issues/prod/coverage/elasticsearch)"
export HOST_FROM_VAULT="$(retry 5 5 vault read -field=host secret/kibana-issues/prod/coverage/elasticsearch)"
export TIME_STAMP=$(date +"%Y-%m-%dT%H:%M:00Z")

echo "--- Print KIBANA_DIR"
echo "### KIBANA_DIR: $KIBANA_DIR"

echo "--- Download previous git sha"
.buildkite/scripts/steps/code_coverage/reporting/downloadPrevSha.sh
previousSha=$(cat downloaded_previous.txt)

echo "--- Upload new git sha"
.buildkite/scripts/steps/code_coverage/reporting/uploadPrevSha.sh

.buildkite/scripts/bootstrap.sh

echo "--- Download coverage arctifacts"
buildkite-agent artifact download target/kibana-coverage/jest/* .
buildkite-agent artifact download target/kibana-coverage/functional/* .

echo "--- process HTML Links"
.buildkite/scripts/steps/code_coverage/reporting/prokLinks.sh

echo "--- collect VCS Info"
.buildkite/scripts/steps/code_coverage/reporting/collectVcsInfo.sh

echo "--- Jest: merging coverage files and generating the final combined report"
echo "### Final replace for jest"
sed -ie "s|CC_REPLACEMENT_ANCHOR|${KIBANA_DIR}|g" target/kibana-coverage/jest/*.json
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js
collectAndUpload target/jest-combined-after-final-replace.tar.gz target/kibana-coverage/jest-combined


echo "--- Functional: merging json files and generating the final combined report"
set +e
sed -ie "s|CC_REPLACEMENT_ANCHOR|${KIBANA_DIR}|g" target/kibana-coverage/functional/*.json
echo "--- Begin Split and Merge for Functional"
splitCoverage target/kibana-coverage/functional
splitMerge
set -e

echo "--- Archive and upload combined reports"
collectAndUpload target/kibana-coverage/jest/kibana-jest-coverage.tar.gz target/kibana-coverage/jest-combined
collectAndUpload target/kibana-coverage/functional/kibana-functional-coverage.tar.gz target/kibana-coverage/functional-combined

echo "--- Upload coverage static site"
.buildkite/scripts/steps/code_coverage/reporting/uploadStaticSite.sh

echo "--- Ingest results to Kibana stats cluster"
.buildkite/scripts/steps/code_coverage/reporting/ingestData.sh 'elastic+kibana+code-coverage' \
  ${BUILDKITE_BUILD_NUMBER} ${BUILDKITE_BUILD_URL} ${previousSha} \
  'src/dev/code_coverage/ingest_coverage/team_assignment/team_assignments.txt'
