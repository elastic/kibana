#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-osquery-cypress-serverless

echo "--- Security Osquery Serverless Cypress"

yarn --cwd x-pack/plugins/osquery cypress:serverless:run
