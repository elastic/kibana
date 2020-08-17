#!/bin/bash

echo ""
echo "### Bootstrap Stats"
echo ""

STATS_PATH=$1
touch $STATS_PATH

# TODO: Pass these in from the env later
JOB_NAME=elastic+kibana+code-coverage
JOB_BUILD_NUMBER=1000

STATS=$(gsutil ls -lr gs://kibana-ci-artifacts/jobs/$JOB_NAME/$JOB_BUILD_NUMBER/coverage \
| grep -v "/:" | grep -v "TOTAL" | grep -v "^$")

echo "### STATS:"
echo ""
echo ${STATS}


cat << EOF > ${STATS_PATH}
const artifactStats = \`
$STATS
\`;

if (!isInBrowser()) {
  module.exports.default = {}
  module.exports.default = artifactStats
} else {
  window.initialData = artifactStats;
}

function isInBrowser() {
  return !!(typeof window !== 'undefined');
}

console.log('### Stat Data loaded!');

EOF

echo ""
echo "###  Bootstrap Stats - Complete"
echo ""
