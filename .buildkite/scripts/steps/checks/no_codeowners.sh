#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

if [[ "${GITHUB_PR_LABELS:-}" == *"backport"* ]]; then
  echo "--- removing codeowners file"
  rm .github/CODEOWNERS || true
  check_for_changed_files 'rm .github/CODEOWNERS' true
fi
