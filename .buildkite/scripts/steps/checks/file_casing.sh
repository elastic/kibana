#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check File Casing
checks-reporter-with-killswitch "Check File Casing" \
  node scripts/check_file_casing --quiet
