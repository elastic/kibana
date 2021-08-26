#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Test Hardening
checks-reporter-with-killswitch "Test Hardening" \
  node scripts/test_hardening
