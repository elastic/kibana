#!/usr/bin/env bash

set -euo pipefail

xs=("$@")

uploadPrefix="gs://elastic-bekitzur-kibana-coverage-live/"
uploadPrefixWithTimeStamp="${uploadPrefix}${TIME_STAMP}/"

uploadBase() {
  for x in 'src/dev/code_coverage/www/index.html' 'src/dev/code_coverage/www/404.html'; do
    gsutil -m -q cp -r -a public-read -z js,css,html "${x}" "${uploadPrefix}"
  done
}

uploadRest() {
  for x in "${xs[@]}"; do
    gsutil -m -q cp -r -a public-read -z js,css,html "target/kibana-coverage/${x}-combined" "${uploadPrefixWithTimeStamp}"
  done
}

uploadBase
uploadRest
