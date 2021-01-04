#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

checks-reporter-with-killswitch "Check Licenses" \
  node scripts/check_licenses --dev
