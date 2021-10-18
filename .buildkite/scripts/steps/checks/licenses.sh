#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Licenses
checks-reporter-with-killswitch "Check Licenses" \
  node scripts/check_licenses --dev
