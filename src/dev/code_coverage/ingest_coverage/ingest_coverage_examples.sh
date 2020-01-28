#!/usr/bin/env bash

# Note: You must run the mocha tests with coverage enabled for this to work.

export BUILD_ID=EXAMPLE
export ES_HOST=https://super:changeme@142fea2d3047486e925eb8b223559cae.europe-west1.gcp.cloud.es.io:9243

node scripts/ingest_coverage.js --verbose --path target/kibana-coverage/mocha/coverage-summary.json-summary
