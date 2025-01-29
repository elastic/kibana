#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/vault_fns.sh
source .buildkite/scripts/steps/code_coverage/util.sh

export CODE_COVERAGE=1
echo "--- Reading Kibana coverage creds from vault"
USER_FROM_VAULT="$(vault_get coverage/elasticsearch username)"
export USER_FROM_VAULT
PASS_FROM_VAULT="$(vault_get coverage/elasticsearch password)"
export PASS_FROM_VAULT
HOST_FROM_VAULT="$(vault_get coverage/elasticsearch host)"
export HOST_FROM_VAULT
TIME_STAMP=$(date +"%Y-%m-%dT%H:%M:00Z")
export TIME_STAMP

.buildkite/scripts/bootstrap.sh

revolveBuildHashes() {
  echo "--- Download previous git sha"
  .buildkite/scripts/steps/code_coverage/reporting/downloadPrevSha.sh
  PREVIOUS_SHA=$(cat downloaded_previous.txt)

  echo "--- Upload new git sha"
  .buildkite/scripts/steps/code_coverage/reporting/uploadPrevSha.sh
}

collectRan() {
  download_artifact target/ran_files/* .

  while read -r x; do
    ran=("${ran[@]}" "$(cat "$x")")
  done <<<"$(find target/ran_files -maxdepth 1 -type f -name '*.txt')"

  echo "--- Collected Ran files: ${ran[*]}"
}

uniqueifyRanConfigs() {
  local xs=("$@")
  local xss
  xss=$(printf "%s\n" "${xs[@]}" | sort -u | tr '\n' ' ' | xargs) # xargs trims whitespace
  uniqRanConfigs=("$xss")
  echo "--- Uniq Ran files: ${uniqRanConfigs[*]}"
}

fetchArtifacts() {
  echo "--- Fetch coverage artifacts"

  local xs=("$@")
  for x in "${xs[@]}"; do
    download_artifact "target/kibana-coverage/${x}/*" .
  done
}

archiveReports() {
  echo "--- Archive and upload combined reports"

  local xs=("$@")
  for x in "${xs[@]}"; do
    echo "### Collect and Upload for: ${x}"
    #    fileHeads "target/file-heads-archive-reports-for-${x}.txt" "target/kibana-coverage/${x}"
    #    dirListing "target/dir-listing-${x}-combined-during-archiveReports.txt" target/kibana-coverage/${x}-combined
    #    dirListing "target/dir-listing-${x}-during-archiveReports.txt" target/kibana-coverage/${x}
    collectAndUpload "target/kibana-coverage/${x}/kibana-${x}-coverage.tar.gz" "target/kibana-coverage/${x}-combined"
  done
}

mergeAll() {
  local xs=("$@")

  for x in "${xs[@]}"; do
    if [ "$x" == "jest" ]; then
      echo "--- [$x]: Reset file paths prefix, merge coverage files, and generate the final combined report"
      replacePaths "$KIBANA_DIR/target/kibana-coverage/jest" "CC_REPLACEMENT_ANCHOR" "$KIBANA_DIR"
      yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js
    elif [ "$x" == "functional" ]; then
      echo "--- Code coverage for functional tests is not collected"
    fi
  done
}

annotateForStaticSite() {
  local xs=("$@")
  local markdownLinks=()

  OLDIFS="${IFS}"
  IFS=$'\n'

  for x in "${xs[@]}"; do
    markdownLinks+=(" - [$x](https://kibana-coverage.elastic.dev/${TIME_STAMP}/${x}-combined/index.html)")
  done

  content=$(
    cat <<-EOF
### Browse the Code Coverage Static Site

_Links are pinned to the current build number._

${markdownLinks[*]}
EOF
  )

  IFS="${OLDIFS}"

  buildkite-agent annotate --style "info" --context 'ctx-coverage-static-site' "${content}"
}

modularize() {
  collectRan
  if [ -d target/ran_files ]; then
    revolveBuildHashes
    uniqueifyRanConfigs "${ran[@]}"
    fetchArtifacts "${uniqRanConfigs[@]}"
    mergeAll "${uniqRanConfigs[@]}"
    archiveReports "${uniqRanConfigs[@]}"
    .buildkite/scripts/steps/code_coverage/reporting/prokLinks.sh "${uniqRanConfigs[@]}"
    .buildkite/scripts/steps/code_coverage/reporting/uploadStaticSite.sh "${uniqRanConfigs[@]}"
    annotateForStaticSite "${uniqRanConfigs[@]}"
    .buildkite/scripts/steps/code_coverage/reporting/collectVcsInfo.sh
    source .buildkite/scripts/steps/code_coverage/reporting/ingestData.sh 'elastic+kibana+code-coverage' \
      "${BUILDKITE_BUILD_NUMBER}" "${BUILDKITE_BUILD_URL}" "${PREVIOUS_SHA}" \
      'src/dev/code_coverage/ingest_coverage/team_assignment/team_assignments.txt'
    ingestModular "${uniqRanConfigs[@]}"
    annotateForKibanaLinks
  else
    echo "--- Found zero configs that ran, cancelling ingestion."
    exit 11
  fi
}

modularize
