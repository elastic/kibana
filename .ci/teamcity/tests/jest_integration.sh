#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-jest-integration

checks-reporter-with-killswitch "Jest Integration Tests" \
  node scripts/jest_integration --ci --verbose --coverage
