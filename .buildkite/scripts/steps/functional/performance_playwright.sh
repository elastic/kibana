#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh
# These tests are running on static workers so we have to make sure we delete previous build of Kibana
rm -rf "$KIBANA_BUILD_LOCATION"
.buildkite/scripts/download_build_artifacts.sh

function is_running {
  kill -0 "$1" &>/dev/null
}

# unset env vars defined in other parts of CI for automatic APM collection of
# Kibana. We manage APM config in our FTR config and performance service, and
# APM treats config in the ENV with a very high precedence.
unset ELASTIC_APM_ENVIRONMENT
unset ELASTIC_APM_TRANSACTION_SAMPLE_RATE
unset ELASTIC_APM_SERVER_URL
unset ELASTIC_APM_SECRET_TOKEN
unset ELASTIC_APM_ACTIVE
unset ELASTIC_APM_CONTEXT_PROPAGATION_ONLY
unset ELASTIC_APM_ACTIVE
unset ELASTIC_APM_SERVER_URL
unset ELASTIC_APM_SECRET_TOKEN
unset ELASTIC_APM_GLOBAL_LABELS

# `kill $esPid` doesn't work, seems that kbn-es doesn't listen to signals correctly, this does work
trap 'killall node -q' EXIT

export TEST_ES_URL=http://elastic:changeme@localhost:9200
export TEST_ES_DISABLE_STARTUP=true

echo "--- determining which journeys to run"

journeys=$(buildkite-agent meta-data get "failed-journeys" --default '')
if [ "$journeys" != "" ]; then
  echo "re-running failed journeys:${journeys}"
else
  paths=()
  for path in x-pack/performance/journeys/*; do
    paths+=("$path")
  done
  journeys=$(printf "%s\n" "${paths[@]}")
  echo "running discovered journeys:${journeys}"
fi

# track failed journeys here which might get written to metadata
failedJourneys=()

while read -r journey; do
  if [ "$journey" == "" ]; then
    continue;
  fi

  echo "--- $journey - 🔎 Start es"

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

  phases=("WARMUP" "TEST")
  status=0
  for phase in "${phases[@]}"; do
    echo "--- $journey - $phase"

    export TEST_PERFORMANCE_PHASE="$phase"

    set +e
    node scripts/functional_tests \
      --config "$journey" \
      --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
      --debug \
      --bail
    status=$?
    set -e

    if [ $status -ne 0 ]; then
      failedJourneys+=("$journey")
      echo "^^^ +++"
      echo "❌ FTR failed with status code: $status"
      break
    fi
  done

  # remove trap, we're manually shutting down
  trap - EXIT;

  echo "--- $journey - 🔎 Shutdown ES"
  killall node
  echo "waiting for $esPid to exit gracefully";

  timeout=30 #seconds
  dur=0
  while is_running $esPid; do
    sleep 1;
    ((dur=dur+1))
    if [ $dur -ge $timeout ]; then
      echo "es still running after $dur seconds, killing ES and node forcefully";
      killall -SIGKILL java
      killall -SIGKILL node
      sleep 5;
    fi
  done
done <<< "$journeys"

echo "--- Upload journey step screenshots"
JOURNEY_SCREENSHOTS_DIR="${KIBANA_DIR}/data/journey_screenshots"
if [ -d "$JOURNEY_SCREENSHOTS_DIR" ]; then
  cd "$JOURNEY_SCREENSHOTS_DIR"
  buildkite-agent artifact upload "**/*fullscreen*.png"
  cd "$KIBANA_DIR"
fi

echo "--- report/record failed journeys"
if [ "${failedJourneys[*]}" != "" ]; then
  buildkite-agent meta-data set "failed-journeys" "$(printf "%s\n" "${failedJourneys[@]}")"

  echo "failed journeys: ${failedJourneys[*]}"
  exit 1
fi
