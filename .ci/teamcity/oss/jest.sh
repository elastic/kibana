#!/bin/bash

# This file is temporary and can be removed once #85850 has been
# merged and the changes included in open PR's (~3 days after merging)

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-oss-jest

checks-reporter-with-killswitch "Jest Unit Tests" \
  node scripts/jest --ci --maxWorkers=5 --verbose
