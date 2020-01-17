#!/usr/bin/env bash

# Note: You must run the mocha tests with coverage enabled for this to work.

export BUILD_ID=TESTING
export ES_HOST=https://super:changeme@87883974a2984732b6cb134e5c7e240f.us-east-1.aws.staging.foundit.no:9243
export TIME_STAMP=$(date -u +%FT%T)

node scripts/ingest_coverage.js --verbose --path target/kibana-coverage/mocha/coverage-summary.json-summary
