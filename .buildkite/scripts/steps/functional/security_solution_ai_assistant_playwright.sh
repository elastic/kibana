#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

mkdir .ftr

vault_get security-ai-assistant-predefined-connectors data -format=json > .ftr/actions_connectors.json

cat .ftr/actions_connectors.json

export JOB=kibana-security-solution-playwright-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- AI Assistant - Security Solution Playwright Tests"

cd x-pack/test/security_solution_playwright

set +e
BK_ANALYTICS_API_KEY=$(vault_get security-solution-ci sec-sol-cypress-bk-api-key)

BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn playwright; status=$?; exit $status
