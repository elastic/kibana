#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Jest Configs
checks-reporter-with-killswitch "Check Jest Configs" \
  node scripts/check_jest_configs
