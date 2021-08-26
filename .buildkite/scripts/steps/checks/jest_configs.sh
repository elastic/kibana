#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Check Jest Configs
checks-reporter-with-killswitch "Check Jest Configs" \
  node scripts/check_jest_configs
