#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Saved Object types
node scripts/check_saved_object_types $GITHUB_PR_MERGE_BASE
