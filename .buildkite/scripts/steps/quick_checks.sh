#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export COLLECT_QUICK_CHECK_CHANGES=true

if [[ "${CI:-}" =~ ^(1|true)$ ]]; then
  export DISABLE_BOOTSTRAP_VALIDATION=false
  .buildkite/scripts/bootstrap.sh
fi

if [[ "${COLLECT_QUICK_CHECK_CHANGES:-}" == "true" ]]; then
  # Get the current HEAD before running checks
  ORIGINAL_HEAD=$(git rev-parse HEAD)
fi

set +e
node scripts/quick_checks --file .buildkite/scripts/steps/checks/quick_checks.json
exit_status=$?
set -e

if [[ "${COLLECT_QUICK_CHECK_CHANGES:-}" == "true" ]]; then
  # Check if any commits were made during the checks
  CURRENT_HEAD=$(git rev-parse HEAD)

  if [[ "$ORIGINAL_HEAD" != "$CURRENT_HEAD" ]]; then
    echo "--- Committing quick_checks changes"
    echo "Changes were committed during quick checks. Pushing to remote..."

    if ! is_auto_commit_disabled && [[ "${BUILDKITE_PULL_REQUEST:-false}" != "false" ]]; then
      gh pr checkout "${BUILDKITE_PULL_REQUEST}"
      git push
      echo "Successfully pushed changes. A new build should start soon."
    else
      echo "Skipping push: auto-commit is disabled or not in a PR context."
    fi
  else
    echo "No changes were made during quick checks."
  fi

  # Also check for any uncommitted changes that might have been missed
  export COLLECT_QUICK_CHECK_CHANGES=false
  check_for_changed_files 'node scripts/quick_checks' true "Collected changes from quick checks"
fi

exit $exit_status
