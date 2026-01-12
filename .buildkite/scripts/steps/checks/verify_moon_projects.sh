#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Verify Moon projects are generated

if is_pr && ! is_auto_commit_disabled && [[ "$BUILDKITE_PULL_REQUEST_BASE_BRANCH" == "main" ]]; then
  node scripts/regenerate_moon_projects.js --update
  check_for_changed_files "node scripts/regenerate_moon_projects.js --update" true
else
  # Do not break on main yet, we can wait until pending PRs get merged in the non-offending version.
#  node scripts/regenerate_moon_projects.js --update
#  check_for_changed_files "node scripts/regenerate_moon_projects.js --update"
  echo "Skipping Moon project verification on non-PR or non-main base branch."
fi
