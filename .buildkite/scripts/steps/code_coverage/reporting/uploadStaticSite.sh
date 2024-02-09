#!/usr/bin/env bash

set -euo pipefail

xs=("$@")

# TODO: Safe to remove this block after 2024-03-01 (https://github.com/elastic/kibana/issues/175904) - also clean up usages
echo "--- Uploading static site (legacy)"
uploadPrefix_old="gs://elastic-bekitzur-kibana-coverage-live/"
uploadPrefixWithTimeStamp_old="${uploadPrefix_old}${TIME_STAMP}/"
uploadBase_old() {
  for x in 'src/dev/code_coverage/www/index.html' 'src/dev/code_coverage/www/404.html'; do
    gsutil -m -q cp -r -a public-read -z js,css,html "${x}" "${uploadPrefix_old}"
  done
}
uploadRest_old() {
  for x in "${xs[@]}"; do
    gsutil -m -q cp -r -a public-read -z js,css,html "target/kibana-coverage/${x}-combined" "${uploadPrefixWithTimeStamp_old}"
  done
}
uploadBase_old
uploadRest_old

echo "--- Uploading static site"
uploadPrefix="gs://elastic-kibana-coverage-live/"
uploadPrefixWithTimeStamp="${uploadPrefix}${TIME_STAMP}/"

uploadBase() {
  for x in 'src/dev/code_coverage/www/index.html' 'src/dev/code_coverage/www/404.html'; do
    gsutil -m -q cp -r -z js,css,html "${x}" "${uploadPrefix}"
  done
}
uploadRest() {
  for x in "${xs[@]}"; do
    gsutil -m -q cp -r -z js,css,html "target/kibana-coverage/${x}-combined" "${uploadPrefixWithTimeStamp}"
  done
}

.buildkite/scripts/common/activate_service_account.sh gs://elastic-kibana-coverage-live
uploadBase
uploadRest
