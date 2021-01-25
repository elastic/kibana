#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-default-jest

checks-reporter-with-killswitch "Jest Unit Tests" \
  node scripts/jest x-pack --ci --verbose --maxWorkers=5
