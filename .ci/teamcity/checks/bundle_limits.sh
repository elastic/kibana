#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

checks-reporter-with-killswitch "Check Bundle Limits" \
  node scripts/build_kibana_platform_plugins --validate-limits
