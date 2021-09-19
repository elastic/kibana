#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Test Hardening
checks-reporter-with-killswitch "Test Hardening" \
  node scripts/test_hardening
