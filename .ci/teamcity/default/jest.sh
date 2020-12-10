#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-default-jest

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Jest Unit Tests" \
  node scripts/jest --bail --debug
