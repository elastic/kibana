#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-jest-integration

checks-reporter-with-killswitch "Jest Integration Tests" \
  node --expose-gc scripts/jest_integration --logHeapUsage --ci --verbose --coverage
