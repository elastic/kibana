#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

checks-reporter-with-killswitch "Lint: stylelint" \
  node scripts/stylelint
