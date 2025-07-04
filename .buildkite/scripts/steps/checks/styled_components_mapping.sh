#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check styled-components mapping
cmd="node scripts/styled_components_mapping"

eval "$cmd"
check_for_changed_files "$cmd" true
