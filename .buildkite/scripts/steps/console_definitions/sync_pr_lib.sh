#!/usr/bin/env bash
# Shared helper for the console sync steps (console definitions and Kibana API doc links).
# Source this file and call create_sync_pr.

KIBANA_MACHINE_USERNAME="kibanamachine"

# create_sync_pr git_scope pr_title pr_body branch_prefix commit_msg slack_key [label...]
#
# Checks for a diff in git_scope, skips (with a slack message) if an open PR for
# pr_title already exists, otherwise opens a new one with auto-merge.
create_sync_pr() {
  local git_scope="$1" pr_title="$2" pr_body="$3" branch_prefix="$4" commit_msg="$5" slack_key="$6"
  shift 6
  local labels=("$@")

  # No diff, nothing to do.
  set +e
  git diff --exit-code --quiet $git_scope
  local diff_status=$?
  set -e
  if [ $diff_status -eq 0 ]; then
    echo "No differences found for '$pr_title'. Exiting.."
    return 0
  fi

  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  echo "Differences found. Checking for an existing pull request."

  # Skip (and send message) if last week's PR is still open.
  local existing_pr_title
  existing_pr_title=$(gh pr list \
    --search "$pr_title" \
    --state open \
    --author "$KIBANA_MACHINE_USERNAME" \
    --limit 1 \
    --json title \
    -q ".[].title")

  if [ "$existing_pr_title" == "$pr_title" ]; then
    echo "PR already exists. Notifying Slack and exiting.."
    _notify_existing_pr "$pr_title" "$slack_key"
    return 0
  fi

  echo "No existing PR found. Proceeding.."

  local branch_name="${branch_prefix}_$(date +%s)"
  git checkout -b "$branch_name"
  git add $git_scope
  git commit -m "$commit_msg"

  echo "Changes committed. Creating pull request."
  git push origin "$branch_name"

  local label_args=()
  local l
  for l in "${labels[@]}"; do
    label_args+=(--label "$l")
  done

  local pr_url
  pr_url=$(gh pr create \
    --title "$pr_title" \
    --body "$pr_body" \
    --base "$BUILDKITE_BRANCH" \
    --head "$branch_name" \
    "${label_args[@]}")

  echo "Enabling auto-merge (squash)"
  if ! gh pr merge "$pr_url" --auto --squash; then
    echo "Warning: Failed to enable auto-merge (squash) for $pr_url"
  fi
}

# _notify_existing_pr pr_title slack_key
#
# Posts a Slack message via buildkite-agent metadata when
# KIBANA_SLACK_NOTIFICATIONS_ENABLED is set. Uses a per call slack_key so that
# multiple syncs skipping in the same build each deliver their own message.
_notify_existing_pr() {
  local pr_title="$1" slack_key="$2"
  local msg="It looks like there is an open \"${pr_title}\" PR that hasn't been merged yet. This week's sync skipped opening a new one — please review/merge the existing PR."
  if [[ "${KIBANA_SLACK_NOTIFICATIONS_ENABLED:-}" =~ ^(1|true)$ ]]; then
    buildkite-agent meta-data set "slack:${slack_key}:body" "$msg" >/dev/null 2>&1 || true
  fi
}
