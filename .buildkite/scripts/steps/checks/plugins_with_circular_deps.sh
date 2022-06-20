#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Plugins With Circular Dependencies
checks-reporter-with-killswitch "Check Plugins With Circular Dependencies" \
  node scripts/find_plugins_with_circular_deps
