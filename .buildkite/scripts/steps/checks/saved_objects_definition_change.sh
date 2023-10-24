#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check SO definition changes
cmd="node scripts/jest_integration -u src/core/server/integration_tests/ci_checks"

eval "$cmd"
check_for_changed_files "$cmd" true
