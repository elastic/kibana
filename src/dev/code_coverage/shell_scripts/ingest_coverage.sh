#!/bin/bash

set -e

echo "### Ingesting Code Coverage"


BUILD_ID=$1
export BUILD_ID

ES_HOST=https://super:changeme@87883974a2984732b6cb134e5c7e240f.us-east-1.aws.staging.foundit.no:9243
export ES_HOST

TIME_STAMP=$(date -u +%Y%m%d_%H%M%SZ)
export TIME_STAMP

for x in jest functional mocha; do
  echo "### Ingesting coverage for ${x}"

  COVERAGE_SUMMARY_FILE=target/kibana-coverage/${x}-combined/coverage-summary.json

  node scripts/ingest_coverage.js --verbose --path ${COVERAGE_SUMMARY_FILE}
  echo "### pwd: $(pwd)"
done

echo "###  Ingesting Code Coverage - Complete"
