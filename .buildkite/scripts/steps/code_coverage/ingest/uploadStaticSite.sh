#!/usr/bin/env bash

set -euo pipefail

# def uploadPrefix = "gs://elastic-bekitzur-kibana-coverage-live/"
# def uploadPrefixWithTimeStamp = "${uploadPrefix}${timestamp}/"

# [
#   'src/dev/code_coverage/www/index.html',
#   'src/dev/code_coverage/www/404.html'
# ].each { uploadWithVault(uploadPrefix, it) }

# [
#   'target/kibana-coverage/functional-combined',
#   'target/kibana-coverage/jest-combined',
# ].each { uploadWithVault(uploadPrefixWithTimeStamp, it) }