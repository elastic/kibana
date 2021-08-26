#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Verify NOTICE
checks-reporter-with-killswitch "Verify NOTICE" \
  node scripts/notice --validate
