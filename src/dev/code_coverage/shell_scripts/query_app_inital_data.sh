#!/bin/bash

set -o xtrace

echo "### Querying App Initial Data"

BUCKET="gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage"
export BUCKET
CURRENT_BUILD_ID=$1
export CURRENT_BUILD_ID
PAST_BUILD_ID=$((CURRENT_BUILD_ID - 29))
export PAST_BUILD_ID
OUT_FILE='bootstrapped.dat'
export OUT_FILE

clearOutFile() {
  echo "### Clearing the 'outfile', ${OUTFILE}"
  touch $OUT_FILE
  echo "" >$OUT_FILE
}

queryDataStore() {
  clearOutFile

  for x in `seq ${PAST_BUILD_ID} ${CURRENT_BUILD_ID}`
  do
    gsutil ls -a ${BUCKET}/${x} 2> errs.txt | grep Z 1>> $OUT_FILE
  done
  echo "### Querying App Initial Data - Complete"
}
queryDataStore
