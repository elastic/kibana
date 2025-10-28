#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

# Retrieve cache if available
restore_target_folders

echo --- Check Types
node scripts/type_check

# Try to archive target folders for future caching
archive_target_folders
