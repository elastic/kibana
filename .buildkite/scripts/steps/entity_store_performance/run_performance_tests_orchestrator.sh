#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh


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

#TODO: Remove this after debugging
echo "Username length: ${#VAULT_USERNAME} characters"
echo "Password length: ${#VAULT_PASSWORD} characters"

# Checkout security-documents-generator
echo "--- Checkout security-documents-generator"
SECURITY_DOCS_GEN_DIR="${KIBANA_DIR}/security-documents-generator"
rm -rf "$SECURITY_DOCS_GEN_DIR"

git clone https://github.com/elastic/security-documents-generator.git "$SECURITY_DOCS_GEN_DIR"
cd "$SECURITY_DOCS_GEN_DIR"

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
export PERF_DATA_FILE="${PERF_DATA_FILE:-small}"
export PERF_INTERVAL="${PERF_INTERVAL:-30}"
export PERF_COUNT="${PERF_COUNT:-10}"
export CLOUD_DEPLOYMENT_ID

# Generate report
echo "--- Generate Performance Report"
source "$KIBANA_DIR/.buildkite/scripts/steps/entity_store_performance/generate_performance_report.sh"
generate_performance_report

exit $TEST_EXIT_CODE

