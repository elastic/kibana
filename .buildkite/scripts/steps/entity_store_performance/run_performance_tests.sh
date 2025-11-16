#!/usr/bin/env bash

set -euo pipefail

# Function to run performance tests
# Requires environment variables:
#   SECURITY_DOCS_GEN_DIR - path to checked out repository
#   CLOUD_DEPLOYMENT_ELASTICSEARCH_URL - Elasticsearch URL
#   CLOUD_DEPLOYMENT_KIBANA_URL - Kibana URL
#   CLOUD_DEPLOYMENT_USERNAME - deployment username
#   CLOUD_DEPLOYMENT_PASSWORD - deployment password
# Optional environment variables:
#   PERF_INTERVAL - interval in seconds (default: 30)
#   PERF_COUNT - number of uploads (default: 10)
#
# Exports:
#   TEST_EXIT_CODE - exit code from test execution
#   TEST_DURATION - test duration in seconds
#   TEST_LOG_DIR - path to logs directory

run_performance_tests() {
  # Validate required environment variables
  if [ -z "${SECURITY_DOCS_GEN_DIR:-}" ]; then
    echo "Error: SECURITY_DOCS_GEN_DIR is required"
    exit 1
  fi

  if [ -z "${CLOUD_DEPLOYMENT_ELASTICSEARCH_URL:-}" ] || \
     [ -z "${CLOUD_DEPLOYMENT_KIBANA_URL:-}" ] || \
     [ -z "${CLOUD_DEPLOYMENT_USERNAME:-}" ] || \
     [ -z "${CLOUD_DEPLOYMENT_PASSWORD:-}" ]; then
    echo "Error: Cloud deployment credentials are required"
    exit 1
  fi

  # Performance test parameters (configurable via env vars)
  PERF_INTERVAL="${PERF_INTERVAL:-30}"
  PERF_COUNT="${PERF_COUNT:-10}"
  PERF_DATA_FILE="big"

  echo "--- Run Entity Store Performance Tests"
  echo "Data file: $PERF_DATA_FILE (will be generated)"
  echo "Interval: ${PERF_INTERVAL}s"
  echo "Count: $PERF_COUNT"

  # Change to repository directory
  cd "$SECURITY_DOCS_GEN_DIR"

  # Generate performance data file
  echo "--- Generate Performance Data File"
  echo "Creating performance data file: $PERF_DATA_FILE with 1000000 entities, 1 log per entity"
  yarn start create-perf-data "$PERF_DATA_FILE" 1000000 1

  # Create config.json
  echo "--- Create config.json"
  jq -n \
    --arg es_url "$CLOUD_DEPLOYMENT_ELASTICSEARCH_URL" \
    --arg es_username "$CLOUD_DEPLOYMENT_USERNAME" \
    --arg es_password "$CLOUD_DEPLOYMENT_PASSWORD" \
    --arg kibana_url "$CLOUD_DEPLOYMENT_KIBANA_URL" \
    --arg kibana_username "$CLOUD_DEPLOYMENT_USERNAME" \
    --arg kibana_password "$CLOUD_DEPLOYMENT_PASSWORD" \
    '{
      elastic: {
        node: $es_url,
        username: $es_username,
        password: $es_password
      },
      kibana: {
        node: $kibana_url,
        username: $kibana_username,
        password: $kibana_password
      }
    }' > config.json

  # Run the performance test
  TEST_START_TIME=$(date +%s)
  set +e
  yarn start upload-perf-data-interval "$PERF_DATA_FILE" \
    --deleteData \
    --interval "$PERF_INTERVAL" \
    --count "$PERF_COUNT"
  TEST_EXIT_CODE=$?
  set -e
  TEST_END_TIME=$(date +%s)
  TEST_DURATION=$((TEST_END_TIME - TEST_START_TIME))

  # Export variables for reporting script
  export TEST_EXIT_CODE
  export TEST_DURATION
  export TEST_LOG_DIR="${SECURITY_DOCS_GEN_DIR}/logs"
  export PERF_DATA_FILE

  echo "Test completed with exit code: $TEST_EXIT_CODE"
  echo "Test duration: ${TEST_DURATION}s"
}

# If script is executed directly (not sourced), run the function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_performance_tests
fi
