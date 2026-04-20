#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

# Get the parent commit SHA for a given SHA.
# Tries local git first, then falls back to the GitHub API.
# The fallback is needed for commits from emergency release (deploy-fix) branches
# that are not present in the local git clone.
getParentSha() {
  local sha="${1}"
  git rev-parse "${sha}^" 2>/dev/null || \
    gh api "repos/elastic/kibana/commits/${sha}" --jq '.parents[0].sha'
}

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
        # Obtain the parent SHA, falling back to the GitHub API for commits not in the local clone
        local parent_sha
        if ! parent_sha="$(getParentSha "$sha")" || [[ -z "$parent_sha" || "$parent_sha" == "null" ]]; then
          echo "❌ Failed to resolve parent SHA for '$sha' while searching for a baseline snapshot." >&2
          return 1
        fi
        sha="$parent_sha"
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

resolveCurrentServerlessReleaseSha() {
  local serverless_release_rev
  local serverless_release_sha

  if ! serverless_release_rev="$(node scripts/get_serverless_release_sha)"; then
    echo "❌ Couldn't determine current serverless release SHA. Aborting Saved Objects checks" >&2
    exit 1
  fi

  if ! serverless_release_sha="$(git rev-parse "$serverless_release_rev")"; then
    echo "❌ Couldn't expand current serverless release SHA. Aborting Saved Objects checks." >&2
    exit 1
  fi

  if [[ -z "$serverless_release_sha" ]]; then
    echo "❌ Couldn't expand current serverless release SHA. Aborting Saved Objects checks." >&2
    exit 1
  fi

  echo "$serverless_release_sha"
}

echo --- Check changes in Saved Objects

if is_pr; then
  # We are on the 'pull_request' pipeline, the goal is to test against the merge-base commit.
  # First, we try to obtain its SHA (or one of its ancestors)
  if ! MERGE_BASE_REV="$(findExistingSnapshotSha "$GITHUB_PR_MERGE_BASE")"; then
    echo "❌ Could not find an existing snapshot to use as a baseline. Please rebase this PR branch onto the latest 'main' commit, then rerun CI." >&2
    exit 1
  fi

  SERVERLESS_BASELINE_FLAG=()
  if [[ "$GITHUB_PR_TARGET_BRANCH" == "main" ]]; then
    GITHUB_SERVERLESS_RELEASE_SHA="$(resolveCurrentServerlessReleaseSha)"
    if ! GITHUB_SERVERLESS_BASELINE_SHA="$(findExistingSnapshotSha "$GITHUB_SERVERLESS_RELEASE_SHA")"; then
      echo "❌ Could not find a GCS snapshot for the current Serverless release or any of its ancestors." >&2
      exit 1
    fi
    SERVERLESS_BASELINE_FLAG=(--serverless-baseline "$GITHUB_SERVERLESS_BASELINE_SHA")
  fi

  if ! is_auto_commit_disabled; then
    # The step might update files like removed_types.json and/or SO fixtures
    node scripts/check_saved_objects --baseline "$MERGE_BASE_REV" "${SERVERLESS_BASELINE_FLAG[@]}" --algorithm both --fix
    check_for_changed_files "node scripts/check_saved_objects" true
  else
    node scripts/check_saved_objects --baseline "$MERGE_BASE_REV" "${SERVERLESS_BASELINE_FLAG[@]}" --algorithm both
  fi
else
  # We are on the 'on-merge' pipeline, the goal is to test against current serverless release,
  # and ONLY if we are in the main branch (older versions most likely won't be compatible)
  if [[ "$GITHUB_PR_TARGET_BRANCH" == "main" ]]; then
    GITHUB_SERVERLESS_RELEASE_SHA="$(resolveCurrentServerlessReleaseSha)"
    if ! GITHUB_SERVERLESS_BASELINE_SHA="$(findExistingSnapshotSha "$GITHUB_SERVERLESS_RELEASE_SHA")"; then
      echo "❌ Could not find a GCS snapshot for the current Serverless release or any of its ancestors." >&2
      exit 1
    fi
    # Perform the check against current serverless release
    node scripts/check_saved_objects --baseline "$GITHUB_SERVERLESS_BASELINE_SHA" --algorithm both
  fi
fi
