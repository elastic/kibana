#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Check Plugins With Circular Dependencies
checks-reporter-with-killswitch "Check Plugins With Circular Dependencies" \
  node scripts/find_plugins_with_circular_deps
