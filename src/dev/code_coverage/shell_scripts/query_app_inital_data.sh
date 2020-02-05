#!/bin/bash

set -e

echo "### Bootstrapping App Initial Data"

BUCKET="gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage"
export BUCKET
CURRENT_BUILD_ID=$1
export CURRENT_BUILD_ID
PAST_BUILD_ID=$((CURRENT_BUILD_ID - 15))
export PAST_BUILD_ID
OUT_FILE='bootstrapped.txt'
export OUT_FILE

queryDataStore () {
  # Sink errors to /dev/null...THEE BITBUCKET :)
  for x in `seq ${PAST_BUILD_ID} ${CURRENT_BUILD_ID}`
  do
    gsutil ls -a ${BUCKET}/${x} 2>/dev/null |grep Z 1>> $OUT_FILE
  done
}
queryDataStore


echo "### Bootstrapping App Initial Data - Complete"
