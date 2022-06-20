#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Telemetry Schema
checks-reporter-with-killswitch "Check Telemetry Schema" \
  node scripts/telemetry_check
