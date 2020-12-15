#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

checks-reporter-with-killswitch "Lint: sasslint" \
  node scripts/sasslint
