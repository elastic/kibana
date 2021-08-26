#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Check Telemetry Schema
checks-reporter-with-killswitch "Check Telemetry Schema" \
  node scripts/telemetry_check
