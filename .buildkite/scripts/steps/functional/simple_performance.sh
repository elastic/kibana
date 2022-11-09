#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
# These tests are running on static workers so we have to make sure we delete previous build of Kibana
rm -rf "$KIBANA_BUILD_LOCATION"
.buildkite/scripts/download_build_artifacts.sh


function is_running {
  kill -0 "$1" &>/dev/null
}

# `kill $esPid` doesn't work, seems that kbn-es doesn't listen to signals correctly, this does work
trap 'killall node -q' EXIT

export TEST_ES_URL=http://elastic:changeme@localhost:9200
export TEST_ES_DISABLE_STARTUP=true

echo "--- 🔎 Start es"

node scripts/es snapshot&
export esPid=$!

# Pings the es server every second for up to 2 minutes until it is green
curl \
  --fail \
  --silent \
  --retry 120 \
  --retry-delay 1 \
  --retry-connrefused \
  -XGET "${TEST_ES_URL}/_cluster/health?wait_for_nodes=>=1&wait_for_status=yellow" \
  > /dev/null

echo "✅ ES is ready and will run in the background"

curl -I -XGET "${TEST_ES_URL}/_cat/indices"
curl -I -XGET "${TEST_ES_URL}/_cat/count?v=true"

cd "$KIBANA_BUILD_LOCATION"

./bin/kibana \
--csp.disableUnsafeEval=true  \
--csp.strict=false  \
--csp.warnLegacyBrowsers=false  \
--elasticsearch.hosts=http://localhost:9200  \
--elasticsearch.password=changeme  \
--elasticsearch.username=kibana_system  \
--env.name=development \
--savedObjects.maxImportPayloadBytes=10485760  \
--server.maxPayload=1679958  \
--server.port=5620  \
--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d  \
--status.allowAnonymous=true  \
--telemetry.banner=false  \
--telemetry.labels="{\"branch\": \"$BUILDKITE_BRANCH\", \"ciBuildNumber\": \"10\", \"journeyName\":\"simple-test\"}"  \
--telemetry.optIn=true  \
--telemetry.sendUsageTo=staging  \
--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf" &
export kibPid=$!


# wait until we can login to kibana
curl 'http://localhost:5620/internal/security/login' \
  -H 'Content-Type: application/json' \
  -H 'kbn-version: 8.6.0-SNAPSHOT' \
  -H 'x-kbn-context: %7B%22name%22%3A%22security_login%22%2C%22url%22%3A%22%2Flogin%22%7D' \
  --fail \
  --silent \
  --retry 120 \
  --retry-delay 5 \
  --data-raw '{"providerType":"basic","providerName":"basic","currentURL":"http://localhost:5620/login?next=%2F","params":{"username":"elastic","password":"changeme"}}' \
  --compressed
  > /dev/null


cd "$KIBANA_DIR"

node scripts/es_archiver load test/functional/fixtures/es_archiver/stress_test --es-url "$TEST_ES_URL"
node scripts/kbn_archiver load test/functional/fixtures/kbn_archiver/stress_test --kibana-url "http://elastic:changeme@localhost:5620/"


echo "--- 🔎 Shutdown Kibana"
check_running_processes
echo "waiting for $kbnPid to exit gracefully";

timeout=30 #seconds
dur=0
while is_running $kbnPid; do
  sleep 1;
  ((dur=dur+1))
  if [ $dur -ge $timeout ]; then
    echo "es still running after $dur seconds, killing Kibana forcefully";
    kill -9 "$kbnPid"
    sleep 5;
  fi
done

echo "--- 🔎 Shutdown ES"
echo "waiting for $esPid to exit gracefully";

timeout=30 #seconds
dur=0
while is_running $esPid; do
  sleep 1;
  ((dur=dur+1))
  if [ $dur -ge $timeout ]; then
    echo "es still running after $dur seconds, killing ES forcefully";
    kill -9 "$esPid"
    sleep 5;
  fi
done