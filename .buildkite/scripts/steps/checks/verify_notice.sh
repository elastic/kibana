#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Verify NOTICE
checks-reporter-with-killswitch "Verify NOTICE" \
  node scripts/notice --validate
