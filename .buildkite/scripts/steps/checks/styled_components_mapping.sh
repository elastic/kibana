#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check styled-components mapping
node scripts/styled_components_mapping
check_for_changed_files "node scripts/styled_components_mapping" true
