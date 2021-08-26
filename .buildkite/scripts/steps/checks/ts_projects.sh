#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Check TypeScript Projects
checks-reporter-with-killswitch "Check TypeScript Projects" \
  node scripts/check_ts_projects
