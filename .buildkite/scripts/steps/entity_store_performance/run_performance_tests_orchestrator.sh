#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh

.buildkite/scripts/bootstrap.sh

# Get PR number
if [[ "${BUILDKITE_PULL_REQUEST:-false}" == "false" ]]; then
  PR_NUMBER="$GITHUB_PR_NUMBER"
else
  PR_NUMBER="$BUILDKITE_PULL_REQUEST"
fi

CLOUD_DEPLOYMENT_NAME="kibana-pr-$PR_NUMBER"

echo "--- Get Cloud Deployment Information"
CLOUD_DEPLOYMENT_ID=$(ecctl deployment list --output json | jq -r '.deployments[] | select(.name == "'$CLOUD_DEPLOYMENT_NAME'") | .id')

if [ -z "${CLOUD_DEPLOYMENT_ID}" ] || [ "${CLOUD_DEPLOYMENT_ID}" == "null" ]; then
  echo "Error: Cloud deployment not found for $CLOUD_DEPLOYMENT_NAME"
  exit 1
fi

echo "Deployment ID: $CLOUD_DEPLOYMENT_ID"

# Get deployment URLs
CLOUD_DEPLOYMENT_KIBANA_URL=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" | jq -r '.resources.kibana[0].info.metadata.aliased_url')
CLOUD_DEPLOYMENT_ELASTICSEARCH_URL=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" | jq -r '.resources.elasticsearch[0].info.metadata.aliased_url')

echo "Kibana URL: $CLOUD_DEPLOYMENT_KIBANA_URL"
echo "Elasticsearch URL: $CLOUD_DEPLOYMENT_ELASTICSEARCH_URL"

# Get deployment resource specifications
echo "--- Get Deployment Resource Specifications"
DEPLOYMENT_JSON=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" --output json)

# Extract hardware profile (deployment template) from plan
DEPLOYMENT_PLAN_JSON=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" --generate-update-payload 2>/dev/null || echo "{}")
ES_HARDWARE_PROFILE=$(echo "$DEPLOYMENT_PLAN_JSON" | jq -r '.resources.elasticsearch[0].plan.deployment_template.id // "unknown"')

# Extract Kibana specifications from info.topology.instances
KIBANA_MEMORY=$(echo "$DEPLOYMENT_JSON" | jq -r '.resources.kibana[0].info.topology.instances[0].memory.instance_capacity // "unknown"')
KIBANA_ZONES=$(echo "$DEPLOYMENT_JSON" | jq -r '[.resources.kibana[0].info.topology.instances[]?.zone] | unique | length // "unknown"')
KIBANA_INSTANCE_CONFIG=$(echo "$DEPLOYMENT_JSON" | jq -r '.resources.kibana[0].info.topology.instances[0].instance_configuration.id // "unknown"')

# Extract Elasticsearch specifications from info.topology.instances
# Sum memory from all instances
ES_TOTAL_MEMORY=$(echo "$DEPLOYMENT_JSON" | jq -r '[.resources.elasticsearch[0].info.topology.instances[]?.memory.instance_capacity // 0] | add // 0')
# Count unique zones
ES_ZONES=$(echo "$DEPLOYMENT_JSON" | jq -r '[.resources.elasticsearch[0].info.topology.instances[]?.zone] | unique | length // "unknown"')
# Count total instances
ES_NODE_COUNT=$(echo "$DEPLOYMENT_JSON" | jq -r '.resources.elasticsearch[0].info.topology.instances | length // 0')
# Create node details string
ES_NODE_DETAILS=$(echo "$DEPLOYMENT_JSON" | jq -r '.resources.elasticsearch[0].info.topology.instances[]? | "\(.instance_name): \(.memory.instance_capacity // 0)MB (\(.zone // "unknown") zone, \(.instance_configuration.id // "unknown"))"' | tr '\n' '; ')

# Export for reporting script
export ES_HARDWARE_PROFILE
export KIBANA_MEMORY
export KIBANA_ZONES
export KIBANA_INSTANCE_CONFIG
export ES_TOTAL_MEMORY
export ES_ZONES
export ES_NODE_COUNT
export ES_NODE_DETAILS

# Get credentials from legacy vault
echo "--- Get Deployment Credentials"

# Ensure we're using legacy vault
export VAULT_ADDR="$LEGACY_VAULT_ADDR"

# Re-source vault_fns.sh to recalculate path prefixes based on VAULT_ADDR
source .buildkite/scripts/common/vault_fns.sh

VAULT_TOKEN_BAK="$VAULT_TOKEN"
VAULT_TOKEN=$(vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
vault login -no-print "$VAULT_TOKEN"

# Use vault_get function (it will use VAULT_PATH_PREFIX which is already set to secret/kibana-issues/dev)
VAULT_USERNAME=$(vault_get "cloud-deploy/$CLOUD_DEPLOYMENT_NAME" username)
VAULT_PASSWORD=$(vault_get "cloud-deploy/$CLOUD_DEPLOYMENT_NAME" password)


VAULT_TOKEN="$VAULT_TOKEN_BAK"

# Remove surrounding quotes and trim whitespace
VAULT_USERNAME=$(echo "$VAULT_USERNAME" | sed -e 's/^"//' -e 's/"$//' | xargs)
VAULT_PASSWORD=$(echo "$VAULT_PASSWORD" | sed -e 's/^"//' -e 's/"$//' | xargs)


if [ -z "$VAULT_USERNAME" ] || [ -z "$VAULT_PASSWORD" ]; then
  echo "Error: Failed to retrieve credentials from vault"
  exit 1
fi

# Checkout security-documents-generator
echo "--- Checkout security-documents-generator"
SECURITY_DOCS_GEN_DIR="${KIBANA_DIR}/security-documents-generator"
rm -rf "$SECURITY_DOCS_GEN_DIR"

# Allow specifying a branch or PR number via environment variable
# Usage: SECURITY_DOCS_GEN_BRANCH=my-branch or SECURITY_DOCS_GEN_PR=123
SECURITY_DOCS_GEN_REPO="https://github.com/elastic/security-documents-generator.git"

if [ -n "${SECURITY_DOCS_GEN_PR:-}" ]; then
  echo "Checking out PR #${SECURITY_DOCS_GEN_PR} from security-documents-generator"
  git clone "$SECURITY_DOCS_GEN_REPO" "$SECURITY_DOCS_GEN_DIR"
  cd "$SECURITY_DOCS_GEN_DIR"
  # Fetch the PR and checkout the merge commit
  git fetch origin "pull/${SECURITY_DOCS_GEN_PR}/head:pr-${SECURITY_DOCS_GEN_PR}"
  git checkout "pr-${SECURITY_DOCS_GEN_PR}"
elif [ -n "${SECURITY_DOCS_GEN_BRANCH:-}" ]; then
  echo "Checking out branch '${SECURITY_DOCS_GEN_BRANCH}' from security-documents-generator"
  git clone --branch "${SECURITY_DOCS_GEN_BRANCH}" "$SECURITY_DOCS_GEN_REPO" "$SECURITY_DOCS_GEN_DIR"
  cd "$SECURITY_DOCS_GEN_DIR"
else
  echo "Checking out main branch from security-documents-generator"
  git clone "$SECURITY_DOCS_GEN_REPO" "$SECURITY_DOCS_GEN_DIR"
  cd "$SECURITY_DOCS_GEN_DIR"
fi

# Setup Node.js version for security-documents-generator
echo "--- Setup Node.js for security-documents-generator"

# Install nvm if not available
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "Installing nvm..."
  mkdir -p "$NVM_DIR"
  # Fetch the latest nvm version tag from GitHub
  NVM_VERSION=$(curl -s https://api.github.com/repos/nvm-sh/nvm/releases/latest | jq -r '.tag_name // "v0.39.7"')
  echo "Installing nvm version: $NVM_VERSION"
  curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
fi

# Load nvm
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Detect and install required Node.js version
if [ -f ".nvmrc" ]; then
  echo "Found .nvmrc file"
  nvm install
  nvm use
elif [ -f "package.json" ]; then
  # Extract version from package.json engines.node
  NODE_VERSION=$(jq -r '.engines.node // empty' package.json 2>/dev/null | sed -E 's/^[^0-9]*([0-9]+\.[0-9]+\.[0-9]+).*/\1/' | head -1)
  if [ -n "$NODE_VERSION" ]; then
    echo "Found Node.js version requirement in package.json: $NODE_VERSION"
    nvm install "$NODE_VERSION"
    nvm use "$NODE_VERSION"
  else
    echo "No Node.js version specified in package.json engines.node"
  fi
fi

echo "Node.js version: $(node --version)"

# Install dependencies
echo "--- Install dependencies"
yarn install

# Export variables for test execution script
export SECURITY_DOCS_GEN_DIR
export CLOUD_DEPLOYMENT_ELASTICSEARCH_URL
export CLOUD_DEPLOYMENT_KIBANA_URL
export CLOUD_DEPLOYMENT_USERNAME="$VAULT_USERNAME"
export CLOUD_DEPLOYMENT_PASSWORD="$VAULT_PASSWORD"

# Run performance tests
echo "--- Run Performance Tests"
source "$KIBANA_DIR/.buildkite/scripts/steps/entity_store_performance/run_performance_tests.sh"
run_performance_tests

# Export variables for reporting script
export TEST_EXIT_CODE
export TEST_DURATION
export TEST_LOG_DIR
export PERF_DATA_FILE="${PERF_DATA_FILE:-standard}"
export PERF_TOTAL_ROWS  # Set by run_performance_tests function
export PERF_ENTITY_COUNT  # Set by run_performance_tests function
export PERF_LOGS_PER_ENTITY  # Set by run_performance_tests function
export PERF_INTERVAL="${PERF_INTERVAL:-30}"
export PERF_COUNT="${PERF_COUNT:-10}"
export CLOUD_DEPLOYMENT_ID

# Generate report
echo "--- Generate Performance Report"
source "$KIBANA_DIR/.buildkite/scripts/steps/entity_store_performance/generate_performance_report.sh"
generate_performance_report

exit $TEST_EXIT_CODE

