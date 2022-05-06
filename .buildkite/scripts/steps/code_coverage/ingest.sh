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

#dirListing "target/dir-listing-jest.txt" target/kibana-coverage/jest

buildkite-agent artifact download target/kibana-coverage/functional/* .
#dirListing "target/dir-listing-functional-after-download.txt" target/kibana-coverage/functional
#fileHeads "target/file-heads-functional-after-download.txt" target/kibana-coverage/functional

echo "--- process HTML Links"
.buildkite/scripts/steps/code_coverage/reporting/prokLinks.sh

echo "--- collect VCS Info"
.buildkite/scripts/steps/code_coverage/reporting/collectVcsInfo.sh

echo "--- Jest: merging coverage files and generating the final combined report"
#dirListing "target/dir-listing-jest-just-before-final-replace.txt" target/kibana-coverage/jest
echo "--- Final replace for jest"
replacePaths target/kibana-coverage/jest
#dirListing "target/dir-listing-jest-after-final-replace.txt" target/kibana-coverage/jest
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js
#dirListing "target/dir-listing-jest-after-report-merge.txt" target/kibana-coverage/jest-combined

echo "--- Functional: merging json files and generating the final combined report"

set +e
echo "--- Final replace for functional"
#fileHeads "target/file-heads-functional-before-final-replace.txt" target/kibana-coverage/functional
#collect target/collect-functional-before-final-replace.tar.gz target/kibana-coverage/functional

#replacePaths target/kibana-coverage/functional
echo "### KIBANA_DIR: $KIBANA_DIR"
sed -ie "s|LEETRE|${KIBANA_DIR}|g" target/kibana-coverage/functional/*.json

#collect target/collect-functional-after-final-replace.tar.gz target/kibana-coverage/functional
#fileHeads "target/file-heads-functional-after-final-replace.txt" target/kibana-coverage/functional
#dirListing "target/dir-listing-functional-after-final-replace.txt" target/kibana-coverage/functional

echo "--- Begin Split and Merge"
splitCoverage target/kibana-coverage/functional
#dirListing "target/dir-listing-functional-after-splitCoverage.txt" target/kibana-coverage/functional
# splitMerge drops its result into: target/kibana-coverage/functional-combined
splitMerge
#dirListing "target/dir-listing-functional-combined-after-splitMerge.txt" target/kibana-coverage/functional-combined
#fileHeads "target/file-heads-functional-combined-after-splitMerge.txt" target/kibana-coverage/functional-combined
set -e


echo "--- Archive and upload combined reports"
collect target/kibana-coverage/jest/kibana-jest-coverage.tar.gz target/kibana-coverage/jest-combined
collect target/kibana-coverage/functional/kibana-functional-coverage.tar.gz target/kibana-coverage/functional-combined

echo "--- Upload coverage static site"
.buildkite/scripts/steps/code_coverage/reporting/uploadStaticSite.sh

echo "--- Ingest results to Kibana stats cluster"
.buildkite/scripts/steps/code_coverage/reporting/ingestData.sh 'elastic+kibana+code-coverage' \
  ${BUILDKITE_BUILD_NUMBER} ${BUILDKITE_BUILD_URL} ${previousSha} \
  'src/dev/code_coverage/ingest_coverage/team_assignment/team_assignments.txt'
