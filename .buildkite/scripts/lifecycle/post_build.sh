#!/usr/bin/env bash

set -euo pipefail

BUILD_SUCCESSFUL=$(node "$(dirname "${0}")/build_status.js")
export BUILD_SUCCESSFUL

"$(dirname "${0}")/commit_status_complete.sh"

node "$(dirname "${0}")/ci_stats_complete.js"
