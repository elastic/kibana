#!/usr/bin/env bash

# Polls a GitHub PR until it reaches the MERGED state.
# Source this file then call: wait_for_pr_merge <PR_URL> [MAX_WAIT_SECONDS] [POLL_INTERVAL_SECONDS]

wait_for_pr_merge() {
  local pr_url="${1:?PR URL is required}"
  local max_wait="${2:-1800}"       # 30 minutes default
  local poll_interval="${3:-30}"    # 30 seconds default

  echo "--- Waiting for PR to be merged: $pr_url"

  local elapsed=0
  while true; do
    local pr_state
    pr_state=$(gh pr view "$pr_url" --repo elastic/kibana --json state --jq '.state')

    if [ "$pr_state" = "MERGED" ]; then
      echo "PR has been merged successfully"
      return 0
    elif [ "$pr_state" = "CLOSED" ]; then
      echo "Error: PR was closed without merging"
      return 1
    fi

    if [ "$elapsed" -ge "$max_wait" ]; then
      echo "Error: Timed out waiting for PR to merge after ${max_wait}s"
      return 1
    fi

    echo "PR state: $pr_state — waiting ${poll_interval}s (${elapsed}s / ${max_wait}s)"
    sleep "$poll_interval"
    elapsed=$((elapsed + poll_interval))
  done
}
