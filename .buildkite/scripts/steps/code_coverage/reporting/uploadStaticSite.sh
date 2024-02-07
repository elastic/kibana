#!/usr/bin/env bash

set -euo pipefail

xs=("$@")

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

echo "--- Uploading static site"

.buildkite/scripts/common/activate_service_account.sh gs://elastic-kibana-coverage-live
uploadBase
uploadRest
