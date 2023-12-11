#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

.buildkite/scripts/bootstrap.sh
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-osquery-cypress

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" 'false'

echo "--- Osquery Cypress tests, burning changed specs (Chrome)"

yarn --cwd x-pack/plugins/osquery cypress:changed-specs-only