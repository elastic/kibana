#!/bin/bash

echo ""
echo "### Bootstrap Stats"
echo ""

STATS_PATH=$1
touch $STATS_PATH

STATS=$(gsutil ls -lr gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/1000/coverage \
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
