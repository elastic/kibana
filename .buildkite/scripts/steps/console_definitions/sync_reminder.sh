#!/usr/bin/env bash
set -euo pipefail

# Slack reminders for the open weekly console definitions sync PR.
# SYNC_REMINDER_MODE=review asks for a review; review_or_close asks to merge or
# close it so the next weekly sync opens a fresh one.

# shellcheck source=scripts/steps/console_definitions/sync_pr_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/sync_pr_lib.sh"

main() {
  local mode="${SYNC_REMINDER_MODE:-}"
  if [[ "$mode" != "review" && "$mode" != "review_or_close" ]]; then
    echo "Error: SYNC_REMINDER_MODE must be 'review' or 'review_or_close', got '${mode}'."
    exit 1
  fi

  local pr_title="[Console] Update console definitions (${BUILDKITE_BRANCH})"
  local pr_url
  pr_url=$(find_open_sync_pr "$pr_title")
  if [ -z "$pr_url" ]; then
    echo "No open '$pr_title' PR. Nothing to remind."
    return 0
  fi

  if [ "$mode" == "review" ]; then
    notify_slack "console_defs_review_reminder" ":slack: Review ${pr_title}" \
      "<${pr_url}|${pr_title}> is still open, please review it."
    return 0
  fi

  notify_slack "console_defs_review_or_close_reminder" ":slack: Review or close ${pr_title}" \
    "<${pr_url}|${pr_title}> is still open. Please merge or close it so next Monday's sync opens a fresh one with the latest definitions."
}

main
