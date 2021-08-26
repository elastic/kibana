#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Check File Casing
checks-reporter-with-killswitch "Check File Casing" \
  node scripts/check_file_casing --quiet
