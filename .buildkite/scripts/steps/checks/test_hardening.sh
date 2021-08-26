#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Test Hardening
checks-reporter-with-killswitch "Test Hardening" \
  node scripts/test_hardening
