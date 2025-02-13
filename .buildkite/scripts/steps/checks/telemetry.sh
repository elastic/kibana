#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Telemetry Schema

if is_pr && ! is_auto_commit_disabled; then
  node scripts/telemetry_check --fix
  check_for_changed_files "node scripts/telemetry_check" true
else
  node scripts/telemetry_check
fi
