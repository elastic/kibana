#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

checks-reporter-with-killswitch "Check Telemetry Schema" \
  node scripts/telemetry_check
