#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

checks-reporter-with-killswitch "Check Plugins With Circular Dependencies" \
  node scripts/find_plugins_with_circular_deps
