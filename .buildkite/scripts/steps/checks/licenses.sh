#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Check Licenses
checks-reporter-with-killswitch "Check Licenses" \
  node scripts/check_licenses --dev
