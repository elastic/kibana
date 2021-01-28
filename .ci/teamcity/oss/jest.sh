#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-oss-jest

checks-reporter-with-killswitch "OSS Jest Unit Tests" \
  node scripts/jest --config jest.config.oss.js --ci --verbose --maxWorkers=5
