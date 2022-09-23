#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh
# These tests are running on static workers so we have to make sure we delete previous build of Kibana
rm -rf "$KIBANA_BUILD_LOCATION"
.buildkite/scripts/download_build_artifacts.sh

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

for journey in x-pack/performance/journeys/*; do
  echo "--- $journey"

  echo "---     🔎 Start es"
  node scripts/es snapshot&
  export esPid=$!
  trap 'kill ${esPid}' EXIT

  export TEST_ES_URL=http://elastic:changeme@localhost:9200
  export TEST_ES_DISABLE_STARTUP=true

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
    echo "---     $phase"

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
      echo "^^^ +++"
      echo "❌ FTR failed with status code: $status"
      break
    fi
  done

  echo "---     Shutdown ES"
  kill $esPid;
  trap - EXIT;

  if [ $status -ne 0 ]; then
    exit 1
  fi
done
