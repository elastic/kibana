#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

checks-reporter-with-killswitch "Check TypeScript Projects" \
  node scripts/check_ts_projects
