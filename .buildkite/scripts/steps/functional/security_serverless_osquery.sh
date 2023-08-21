#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

export JOB=kibana-osquery-cypress-serverless

echo "--- Security Osquery Serverless Cypress"

yarn --cwd x-pack/plugins/osquery cypress:serverless:run
