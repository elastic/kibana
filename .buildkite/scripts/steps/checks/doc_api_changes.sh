#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Check Doc API Changes
checks-reporter-with-killswitch "Check Doc API Changes" \
  node scripts/check_published_api_changes
