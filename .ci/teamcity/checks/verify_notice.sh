#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

checks-reporter-with-killswitch "Verify NOTICE" \
  node scripts/notice --validate
