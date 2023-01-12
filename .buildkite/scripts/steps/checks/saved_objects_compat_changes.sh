#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Saved objects compatible mappings check
cmd="node src/cli_compatible_mappings_check/dev.js check"
eval "$cmd"
check_for_changed_files "$cmd" true
