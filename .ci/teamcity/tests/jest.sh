#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-jest

checks-reporter-with-killswitch "Jest Unit Tests" \
  node scripts/jest --ci --maxWorkers=5 --verbose
