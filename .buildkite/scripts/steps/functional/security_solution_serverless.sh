#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-serverless-security-cypress

echo "--- Security Serverless Cypress"

yarn --cwd x-pack/test_serverless/functional/test_suites/security/cypress cypress:run
