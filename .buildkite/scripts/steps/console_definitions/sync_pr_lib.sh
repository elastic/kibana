#!/usr/bin/env bash
# Shared helper for the console sync steps (console definitions and Kibana API doc links).
# Source this file and call create_sync_pr.

KIBANA_MACHINE_USERNAME="kibanamachine"

# create_sync_pr git_scope pr_title pr_body branch_prefix commit_msg slack_key auto_merge [label...]
#
# Checks for a diff in git_scope, skips (with a slack message) if an open PR for
# pr_title already exists, otherwise opens a new one and optionally enables auto-merge.
create_sync_pr() {
  local git_scope="$1" pr_title="$2" pr_body="$3" branch_prefix="$4" commit_msg="$5" slack_key="$6" auto_merge="$7"
  shift 7
  local labels=("$@")

  # No tracked or untracked changes, nothing to do.
  local changes
  changes=$(git status --porcelain --untracked-files=all -- "$git_scope")
  if [ -z "$changes" ]; then
    echo "No differences found for '$pr_title'. Exiting.."
    return 0
  fi

  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  echo "Differences found. Checking for an existing pull request."

  # Skip (and send message) if last week's PR is still open.
  local existing_pr_url
  existing_pr_url=$(find_open_sync_pr "$pr_title")

  if [ -n "$existing_pr_url" ]; then
    echo "PR already exists. Notifying Slack and exiting.."
    notify_slack "$slack_key" ":slack: ${pr_title} still open" \
      "<${existing_pr_url}|${pr_title}> hasn't been merged yet. This week's sync skipped opening a new one, please review/merge the existing PR."
    return 0
  fi

  echo "No existing PR found. Proceeding.."

  local branch_name="${branch_prefix}_$(date +%s)"
  git checkout -b "$branch_name"
  git add -- "$git_scope"
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

  if [[ "$auto_merge" =~ ^(1|true)$ ]]; then
    echo "Enabling auto-merge (squash)"
    if ! gh pr merge "$pr_url" --auto --squash; then
      echo "Warning: Failed to enable auto-merge (squash) for $pr_url"
    fi
  else
    echo "Auto-merge disabled for $pr_url"
  fi
}

# find_open_sync_pr pr_title
#
# Prints the URL of the open sync PR titled exactly pr_title, or nothing.
# Returns gh's status on failure, since callers run it inside $(...) where
# errexit doesn't apply.
find_open_sync_pr() {
  local pr_title="$1" matches title url
  # Repeated author: qualifiers are ORed; gh's GraphQL search returns nothing for (a OR b) groups.
  matches=$(gh pr list \
    --search "\"$pr_title\" in:title author:$KIBANA_MACHINE_USERNAME author:app/elastic-vault-github-plugin-prod" \
    --state open \
    --limit 20 \
    --json title,url \
    -q '.[] | "\(.title)\t\(.url)"') || return

  while IFS=$'\t' read -r title url; do
    if [ "$title" == "$pr_title" ]; then
      echo "$url"
      return 0
    fi
  done <<< "$matches"
}

# notify_slack step_key step_label message
#
# Uploads a no-op step whose own Slack notify posts message to
# SLACK_NOTIFICATIONS_CHANNEL. Build level notifications only fire for failed
# builds, and these messages come from passing ones. Uses a per call step_key so
# that multiple syncs in the same build each deliver their own message.
notify_slack() {
  local step_key="$1" step_label="$2" message="$3"
  local channel="${SLACK_NOTIFICATIONS_CHANNEL:-}"

  if [[ ! ( "${ELASTIC_SLACK_NOTIFICATIONS_ENABLED:-}" =~ ^(1|true)$ || "${KIBANA_SLACK_NOTIFICATIONS_ENABLED:-}" =~ ^(1|true)$ ) || -z "$channel" ]]; then
    echo "Slack notifications disabled or no channel set, not posting: $message"
    return 0
  fi

  # The channel goes into generated pipeline YAML, so accept only a plain channel name.
  if [[ ! "$channel" =~ ^#[A-Za-z0-9_-]+$ ]]; then
    echo "Refusing to post: SLACK_NOTIFICATIONS_CHANNEL is not a plain channel name."
    return 1
  fi

  local notify_file
  notify_file="$(mktemp -t console-sync-notify.XXXXXX.yml)"
  {
    echo 'steps:'
    echo "  - key: \"${step_key}\""
    echo "    label: \"${step_label}\""
    echo "    command: \"echo 'Posted to Slack'\""
    echo '    agents:'
    echo '      image: family/kibana-minimal-ubuntu-2604'
    echo '      imageProject: elastic-images-prod'
    echo '      provider: gcp'
    echo '      machineType: n2-standard-2'
    echo '      preemptible: true'
    echo '      spotZones: asia-south2-a,asia-south2-b,asia-south2-c,northamerica-northeast2-a,northamerica-northeast2-b,northamerica-northeast2-c'
    echo '    notify:'
    echo '      - slack:'
    echo '          channels:'
    echo "            - \"$channel\""
    echo '          message: |'
    echo "            ${message}"
    echo '        if: step.outcome == "passed"'
  } > "$notify_file"

  buildkite-agent pipeline upload "$notify_file"
}
