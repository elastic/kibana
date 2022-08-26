#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

#.buildkite/scripts/bootstrap.sh
echo "--- yarn kbn reset && yarn kbn bootstrap"
yarn kbn reset && yarn kbn bootstrap

GCS_ARTIFACTS_DIR="gcs_artefacts"
SCALABILITY_ARTIFACTS_LOCATION="$WORKSPACE/$GCS_ARTIFACTS_DIR"
GCS_BUCKET="gs://kibana-performance/scalability-tests"

# These tests are running on static workers so we must delete previous Kibana build and scalability artifacts
rm -rf "$KIBANA_BUILD_LOCATION"
rm -rf "$SCALABILITY_ARTIFACTS_LOCATION"

echo "--- Download the latest artifacts from single user performance pipeline"
source .buildkite/scripts/steps/scalability/download_artifacts.sh

echo "--- Clone kibana-load-testing repo and prepare project"
source .buildkite/scripts/steps/scalability/build_load_runner.sh

echo "--- Run Scalability Tests with Elasticsearch started only once and Kibana restart before each journey"
cd "$KIBANA_DIR"
node scripts/es snapshot&

esPid=$!

# unset env vars defined in other parts of CI for automatic APM collection of
# Kibana. We manage APM config in our FTR config and performance service, and
# APM treats config in the ENV with a very high precedence.
unset ELASTIC_APM_ENVIRONMENT
unset ELASTIC_APM_TRANSACTION_SAMPLE_RATE
unset ELASTIC_APM_SERVER_URL
unset ELASTIC_APM_SECRET_TOKEN
unset ELASTIC_APM_ACTIVE
unset ELASTIC_APM_CONTEXT_PROPAGATION_ONLY
unset ELASTIC_APM_GLOBAL_LABELS
unset ELASTIC_APM_MAX_QUEUE_SIZE
unset ELASTIC_APM_METRICS_INTERVAL
unset ELASTIC_APM_CAPTURE_SPAN_STACK_TRACES
unset ELASTIC_APM_BREAKDOWN_METRICS

export TEST_ES_URL=http://elastic:changeme@localhost:9200
export TEST_ES_DISABLE_STARTUP=true

# Pings the ES server every second for 2 mins until its status is green
curl --retry 120 \
  --retry-delay 1 \
  --retry-connrefused \
  -I -XGET "${TEST_ES_URL}/_cluster/health?wait_for_nodes=>=1&wait_for_status=yellow"

export ELASTIC_APM_ACTIVE=true

# Overriding Gatling default configuration
export ES_HOST="http://localhost:9200"

for file in scalability_traces/server/*; do
    export SCALABILITY_JOURNEY_PATH="$KIBANA_DIR/$file"
    echo "--- Run scalability file: $SCALABILITY_JOURNEY_PATH"
    node scripts/functional_tests \
      --config x-pack/test/performance/scalability/config.ts \
      --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
      --debug
done

kill "$esPid"

# Save test reports as build artifacts
echo "--- Archive Gatling reports and upload as build artifacts"
tar -czf "scalability_test_report.tar.gz" --exclude=simulation.log -C kibana-load-testing/target gatling
buildkite-agent artifact upload "scalability_test_report.tar.gz"
