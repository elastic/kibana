#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Check i18n
checks-reporter-with-killswitch "Check i18n" \
  node scripts/i18n_check --ignore-missing
