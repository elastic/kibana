#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

# Function to find a valid commit SHA, aka a SHA for which a snapshot exists
findExistingSnapshotSha() {
  # The merge base commit, to start looking for existing snapshots.
  local sha="${1}"
  # The maximum number of attempts to find a existing snapshot,
  # recursing through the commit parent hierarchy. (defaults to 10)
  local max_attempts="${2:-10}"

  # Counter for the number of attempts made.
  local attempts=1

  while [ $attempts -le $max_attempts ]; do
    # Use curl to check the URL.
    local url="https://storage.googleapis.com/kibana-so-types-snapshots/$sha.json"
    local http_status=$(curl -o /dev/null -I -sw "%{http_code}" "$url")

    # Check if the HTTP status code indicates success (2xx or 3xx range).
    if [[ "$http_status" =~ ^[23] ]]; then
      echo "$sha" # Echo the valid SHA to standard output
      return 0    # Return success status
    else
      if [[ "$http_status" == "404"* ]]; then
        echo "Snapshot '$url' NOT FOUND, fetching parent commit snapshot (attempt $attempts of $max_attempts)..." >&2
        # Obtain the parent SHA
        sha=$(git rev-parse "$sha"^)
      else
        echo "Error fetching snapshot '$url' (attempt $attempts of $max_attempts)..." >&2
      fi

      # Increment the attempts counter.
      attempts=$((attempts + 1))

      # Pause before the next attempt.
      sleep 2
    fi
  done

  return 1
}

echo --- Check changes in Saved Objects

if is_pr; then
  # We are on the 'pull_request' pipeline, the goal is to test against the merge-base commit.
  # First, we try to obtain its SHA (or one of its ancestors)
  MERGE_BASE_REV="$(findExistingSnapshotSha "$GITHUB_PR_MERGE_BASE")"
  if [[ $? -ne 0 ]]; then
    echo "❌ Could not find an existing snapshot to use as a baseline. Aborting Saved Objects checks" >&2
    exit 1
  fi

  if ! is_auto_commit_disabled; then
    # The step might update files like removed_types.json and/or SO fixtures
    node scripts/check_saved_objects --baseline "$MERGE_BASE_REV" --fix
    check_for_changed_files "node scripts/check_saved_objects" true
  else
    node scripts/check_saved_objects --baseline "$MERGE_BASE_REV"
  fi
else
  # We are on the 'on-merge' pipeline, the goal is to test against current serverless release,
  # and ONLY if we are in the main branch (older versions most likely won't be compatible)
  if [[ "$GITHUB_PR_TARGET_BRANCH" == "main" ]]; then
    # Obtain the current serverless release SHA from serverless-gitops
    GITHUB_SERVERLESS_RELEASE_REV="$(node scripts/get_serverless_release_sha)"
    if [[ $? -ne 0 ]]; then
      echo "❌ Couldn't determine current serverless release SHA. Aborting Saved Objects checks" >&2
      exit 1
    fi

    # Expand to get the full SHA
    GITHUB_SERVERLESS_RELEASE_SHA="$(git rev-parse "$GITHUB_SERVERLESS_RELEASE_REV")"
    if [[ $? -ne 0 || -z "$GITHUB_SERVERLESS_RELEASE_SHA" ]]; then
      echo "❌ Couldn't expand current serverless release SHA. Skipping check against Serverless baseline."  >&2
      exit 1
    fi

    # Perform the check against current serverless release
    node scripts/check_saved_objects --baseline "$GITHUB_SERVERLESS_RELEASE_SHA"
  fi
fi
