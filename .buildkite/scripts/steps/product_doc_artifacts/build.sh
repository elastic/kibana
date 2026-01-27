#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

if [[ "$(type -t vault_get)" != "function" ]]; then
  source .buildkite/scripts/common/vault_fns.sh
fi

echo "--- Bootstrap Kibana"
.buildkite/scripts/bootstrap.sh

echo "--- Get Source Cluster Credentials from Vault"
SOURCE_CLUSTER_CONFIG_B64="$(vault_get ai-infra-ci-docs source-cluster-config)"
SOURCE_CLUSTER_CONFIG_JSON="$(echo "$SOURCE_CLUSTER_CONFIG_B64" | base64 -d)"

export KIBANA_SOURCE_CLUSTER_URL="$(echo "$SOURCE_CLUSTER_CONFIG_JSON" | jq -r '.sourceClusterUrl')"
export KIBANA_SOURCE_CLUSTER_API_KEY="$(echo "$SOURCE_CLUSTER_CONFIG_JSON" | jq -r '.sourceClusterApiKey')"
export KIBANA_SOURCE_CLUSTER_USERNAME="$(echo "$SOURCE_CLUSTER_CONFIG_JSON" | jq -r '.sourceClusterUsername')"
export KIBANA_SOURCE_CLUSTER_PASSWORD="$(echo "$SOURCE_CLUSTER_CONFIG_JSON" | jq -r '.sourceClusterPassword')"
export KIBANA_SOURCE_INDEX="$(echo "$SOURCE_CLUSTER_CONFIG_JSON" | jq -r '.sourceIndex')"

# Validate required environment variables
echo "--- Validating environment variables"
required_vars=(
  "KIBANA_SOURCE_CLUSTER_URL"
  "KIBANA_SOURCE_CLUSTER_API_KEY"
  "KIBANA_SOURCE_CLUSTER_USERNAME"
  "KIBANA_SOURCE_CLUSTER_PASSWORD"
  "KIBANA_SOURCE_INDEX"
  "KIBANA_EMBEDDING_CLUSTER_URL"
  "KIBANA_EMBEDDING_CLUSTER_USERNAME"
  "KIBANA_EMBEDDING_CLUSTER_PASSWORD"
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Required environment variable $var is not set"
    exit 1
  fi
done
echo "✅ All required environment variables are set"

# Set stack version (can be empty/undefined)
# If STACK_VERSION is set, use it; otherwise don't pass the argument
STACK_VERSION_ARGS=()
if [[ -n "${STACK_VERSION:-}" ]]; then
  STACK_VERSION_ARGS=("--stack-version=${STACK_VERSION}")
fi

echo "--- Starting Elasticsearch"
# Start Elasticsearch in the background
yarn es snapshot --license trial &
ES_PID=$!

# Wait for Elasticsearch to be ready
echo "--- Waiting for Elasticsearch to be ready"
MAX_WAIT=300
WAIT_TIME=0
while ! curl -s -u "${KIBANA_EMBEDDING_CLUSTER_USERNAME}:${KIBANA_EMBEDDING_CLUSTER_PASSWORD}" "${KIBANA_EMBEDDING_CLUSTER_URL}" > /dev/null 2>&1; do
  if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    echo "❌ Elasticsearch failed to start within ${MAX_WAIT} seconds"
    kill $ES_PID 2>/dev/null || true
    exit 1
  fi
  sleep 5
  WAIT_TIME=$((WAIT_TIME + 5))
  echo "Waiting for Elasticsearch... (${WAIT_TIME}s)"
done
echo "✅ Elasticsearch is ready"

echo "--- Starting Kibana"
# Start Kibana in the background
node scripts/kibana --dev --no-base-path > /tmp/kibana.log 2>&1 &
KIBANA_PID=$!

# Wait for Kibana to be ready
echo "--- Waiting for Kibana to be ready"
MAX_WAIT=600
WAIT_TIME=0
while ! curl -s http://localhost:5601/api/status > /dev/null 2>&1; do
  if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    echo "❌ Kibana failed to start within ${MAX_WAIT} seconds"
    echo "--- Kibana logs (last 50 lines):"
    tail -50 /tmp/kibana.log || true
    kill $KIBANA_PID 2>/dev/null || true
    kill $ES_PID 2>/dev/null || true
    exit 1
  fi
  sleep 10
  WAIT_TIME=$((WAIT_TIME + 10))
  echo "Waiting for Kibana... (${WAIT_TIME}s)"
done
echo "✅ Kibana is ready"

# Function to cleanup background processes
cleanup() {
  echo "--- Cleaning up background processes"
  kill $KIBANA_PID 2>/dev/null || true
  kill $ES_PID 2>/dev/null || true
  wait $KIBANA_PID 2>/dev/null || true
  wait $ES_PID 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

echo "--- Building Product Doc Artifacts"

# Build artifacts for each product (default inference)
echo "--- Building artifacts with default inference"
node scripts/build_product_doc_artifacts.js --product-name=kibana "${STACK_VERSION_ARGS[@]}"
node scripts/build_product_doc_artifacts.js --product-name=elasticsearch "${STACK_VERSION_ARGS[@]}"
node scripts/build_product_doc_artifacts.js --product-name=security "${STACK_VERSION_ARGS[@]}"
node scripts/build_product_doc_artifacts.js --product-name=observability "${STACK_VERSION_ARGS[@]}"

# Build artifacts with E5 inference
echo "--- Building artifacts with E5 inference"
node scripts/build_product_doc_artifacts.js --product-name=kibana "${STACK_VERSION_ARGS[@]}" --inference-id=.multilingual-e5-small-elasticsearch
node scripts/build_product_doc_artifacts.js --product-name=elasticsearch "${STACK_VERSION_ARGS[@]}" --inference-id=.multilingual-e5-small-elasticsearch
node scripts/build_product_doc_artifacts.js --product-name=observability "${STACK_VERSION_ARGS[@]}" --inference-id=.multilingual-e5-small-elasticsearch
node scripts/build_product_doc_artifacts.js --product-name=security "${STACK_VERSION_ARGS[@]}" --inference-id=.multilingual-e5-small-elasticsearch

echo "✅ All product doc artifacts built successfully"
