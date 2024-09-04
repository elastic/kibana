#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

export JOB=kibana-osquery-cypress

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" 'false'

echo "--- Osquery Cypress tests, burning changed specs (Chrome)"

yarn --cwd x-pack/plugins/osquery cypress:changed-specs-only
