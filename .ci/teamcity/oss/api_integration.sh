#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-oss-api-integration

checks-reporter-with-killswitch "API Integration Tests" \
  node scripts/functional_tests --config test/api_integration/config.js --bail --debug
