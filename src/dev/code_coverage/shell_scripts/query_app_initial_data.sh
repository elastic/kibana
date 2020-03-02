#!/bin/bash

set -o xtrace

echo "### Querying App Initial Data"

BUCKET="gs://elastic-bekitzur-kibana-coverage-live/jobs/elastic+kibana+code-coverage"
export BUCKET
OUT_FILE='bootstrapped.dat'
export OUT_FILE

clearOutFile() {
  echo "### Clearing the 'outfile', ${OUTFILE}"
  touch $OUT_FILE
  echo "" >$OUT_FILE
}

queryDataStore() {
  clearOutFile

  gsutil ls ${BUCKET} 2> errs.txt | grep Z 1>> $OUT_FILE

  echo "### Querying App Initial Data - Complete"
}
queryDataStore

cat $OUT_FILE
echo ""
echo "### Printing App Initial Data - Complete"
echo ""

