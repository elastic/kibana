#!/bin/bash -e
DEPLOY_URL=${1:-http://kibana.cityindex.logsearch.io}

echo "====> Running smoke tests against $DEPLOY_URL"

echo "Checking Kibana status from IP $(curl -s icanhazip.com)"
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
STATUS=$(curl -s $DEPLOY_URL) 
if [[ "$STATUS" =~ "Kibana 3" ]]; then
  echo "All smoke tests passing.  Yay!"
else
  echo "Smoke tests failed :-# "
  echo "curl -s $DEPLOY_URL returned:"
  echo $STATUS
  exit 1
fi
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
