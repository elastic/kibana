#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/../../common/util.sh"

echo "Running prompt changes comment post..."
ts-node .buildkite/scripts/steps/checks/prompt_changes_detector.ts
