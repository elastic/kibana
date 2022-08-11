#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check FTR Configs
checks-reporter-with-killswitch "Check FTR Configs" \
  node scripts/check_ftr_configs
