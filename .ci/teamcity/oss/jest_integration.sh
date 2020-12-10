#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-oss-jest-integration

checks-reporter-with-killswitch "OSS Jest Integration Tests" \
  node scripts/jest_integration --verbose
