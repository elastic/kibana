#!/usr/bin/env bash

set -euo pipefail

xs=("$@")

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
.buildkite/scripts/common/activate_service_account.sh --unset-impersonation
