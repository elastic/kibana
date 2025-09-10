#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/../../common/util.sh"

echo "--- Check for prompt file changes"

if ! is_pr; then
  echo "Not a PR, skipping prompt changes detection"
  exit 0
fi

echo "Running prompt changes detector..."
ts-node .buildkite/scripts/steps/checks/prompt_changes_detector.ts
