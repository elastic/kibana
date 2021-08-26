#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Check Bundle Limits

checks-reporter-with-killswitch "Check Bundle Limits" \
  node scripts/build_kibana_platform_plugins --validate-limits
