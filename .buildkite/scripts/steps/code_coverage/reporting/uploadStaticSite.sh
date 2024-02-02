#!/usr/bin/env bash

set -euo pipefail

xs=("$@")

# TODO: Safe to remove this after 2024-03-01 (https://github.com/elastic/kibana/issues/175904) - also clean up usages
uploadPrefix_old="gs://elastic-bekitzur-kibana-coverage-live/"
uploadPrefixWithTimeStamp_old="${uploadPrefix_old}${TIME_STAMP}/"

uploadPrefix="gs://elastic-kibana-coverage-live/"
uploadPrefixWithTimeStamp="${uploadPrefix}${TIME_STAMP}/"

uploadBase() {
  for x in 'src/dev/code_coverage/www/index.html' 'src/dev/code_coverage/www/404.html'; do
    gsutil -m -q cp -r -a public-read -z js,css,html "${x}" "${uploadPrefix}"
    gsutil -m -q cp -r -a public-read -z js,css,html "${x}" "${uploadPrefix_old}"
  done
}

uploadRest() {
  for x in "${xs[@]}"; do
    gsutil -m -q cp -r -a public-read -z js,css,html "target/kibana-coverage/${x}-combined" "${uploadPrefixWithTimeStamp}"
    gsutil -m -q cp -r -a public-read -z js,css,html "target/kibana-coverage/${x}-combined" "${uploadPrefixWithTimeStamp_old}"
  done
}

uploadBase
uploadRest
