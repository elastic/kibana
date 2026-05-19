#!/usr/bin/env bash
set -euo pipefail

# TODO(ownership): the Backstage owner (`group:kibana-operations`), the
# `Team:Kibana Operations` label added to the bot PR below, and the team
# access levels in `.buildkite/pipeline-resource-definitions/kibana-renovate-reviewer-sync.yml`
# are placeholders pending a decision on which team owns this weekly signal.
# The runtime paths that actually ping a team (fallback reviewer, always-added
# reviewer) have been removed so only CODEOWNERS-derived reviewers are pinged.

GIT_SCOPE="renovate.json"

KIBANA_MACHINE_USERNAME="kibanamachine"
KIBANA_MACHINE_EMAIL="42973632+kibanamachine@users.noreply.github.com"

SCRIPT_SOURCE="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd)"
NODE_HELPERS_SCRIPT="${SCRIPT_DIR}/renovate_review_sync/helpers.js"

# Title is used both to create the bot PR and to find/close a stale one when managed drift
# self-heals on `main`, so it lives at script scope.
PR_TITLE='[Renovate] Sync reviewers for managed rules'

# Hidden HTML-comment marker embedded in the bot PR body; lets the next weekly run see
# which teams the bot itself previously requested as reviewers, so removed teams can be
# cleaned up symmetrically without touching humans (or teams that humans manually added).
# Format: `<!-- bot-managed-reviewer-teams: elastic/team-a elastic/team-b -->`
BOT_MANAGED_REVIEWERS_MARKER_PREFIX="<!-- bot-managed-reviewer-teams:"
BOT_MANAGED_REVIEWERS_MARKER_SUFFIX="-->"

report_main_step () {
  echo "--- $1"
}

buildkite_annotate () {
  local body="$1"
  local style="${2:-info}"

  if command -v buildkite-agent >/dev/null 2>&1; then
    # Use a fixed context so re-runs overwrite rather than spam annotations.
    buildkite-agent annotate --style "$style" --context "renovate-reviewer-sync" "$body"
  else
    echo "--- Buildkite annotation (buildkite-agent not available)"
    echo "$body"
  fi
}

node_helper () {
  node "$NODE_HELPERS_SCRIPT" "$@"
}

compute_new_reviewers_to_request () {
  local pr_number="$1"
  local computed_reviewers="$2"

  if [ -z "${computed_reviewers:-}" ]; then
    return 0
  fi

  local existing_reviewers
  if ! existing_reviewers="$(gh pr view "$pr_number" --json reviewRequests 2>/dev/null | node_helper requested-reviewers)"; then
    echo "WARN: Failed to read existing review requests for #${pr_number}; skipping new reviewer requests this run"
    return 0
  fi

  # Use sorted set difference: computed - existing.
  # The computed side is a space-separated string; we intentionally word-split it into one
  # line per reviewer. The existing side is already newline-separated from
  # `node_helper requested-reviewers`, so it stays quoted.
  # shellcheck disable=SC2086
  comm -23 \
    <(printf '%s\n' $computed_reviewers | sort -u) \
    <(printf '%s\n' "${existing_reviewers:-}" | sort -u)
}

best_effort_request_reviewers () {
  local pr_number="$1"
  shift

  if [ "$#" -eq 0 ]; then
    return 0
  fi

  echo "--- Requesting reviewers (best-effort)"
  for reviewer in "$@"; do
    if gh pr edit "$pr_number" --add-reviewer "$reviewer" >/dev/null 2>&1; then
      echo "Requested review from $reviewer"
    else
      echo "WARN: Failed to request review from $reviewer (continuing)"
    fi
  done
}

best_effort_add_labels () {
  local pr_number="$1"
  shift

  if [ "$#" -eq 0 ]; then
    return 0
  fi

  echo "--- Adding labels (best-effort)"
  for label in "$@"; do
    if gh pr edit "$pr_number" --add-label "$label" >/dev/null 2>&1; then
      echo "Added label $label"
    else
      echo "WARN: Failed to add label $label (continuing)"
    fi
  done
}

extract_marker_teams_from_body () {
  # Capture whatever sits between the marker prefix and suffix on a single line.
  # Outputs one `elastic/<slug>` per line. Produces no output when the marker is missing
  # or malformed (e.g. unclosed) so a missing/garbled marker can never trigger spurious
  # removals downstream.
  local body="$1"
  printf '%s\n' "$body" | \
    sed -n "s|.*${BOT_MANAGED_REVIEWERS_MARKER_PREFIX} \(.*\) ${BOT_MANAGED_REVIEWERS_MARKER_SUFFIX}.*|\1|p" | \
    head -1 | \
    tr -s ' ' '\n' | \
    sed '/^$/d'
}

compute_stale_team_reviewers_to_remove () {
  # Set difference: previous_marker - current_computed. Both inputs are space-separated.
  # We word-split intentionally and drop empty lines so an empty input doesn't show up
  # in the output.
  local previous_teams="$1"
  local current_teams="$2"
  # shellcheck disable=SC2086
  comm -23 \
    <(printf '%s\n' ${previous_teams:-} | sort -u | sed '/^$/d') \
    <(printf '%s\n' ${current_teams:-} | sort -u | sed '/^$/d')
}

compute_requested_stale_team_reviewers_to_remove () {
  local pr_number="$1"
  local previous_teams="$2"
  local current_teams="$3"

  local stale_teams
  stale_teams="$(compute_stale_team_reviewers_to_remove "$previous_teams" "$current_teams")"
  if [ -z "${stale_teams:-}" ]; then
    return 0
  fi

  local existing_reviewers
  if ! existing_reviewers="$(gh pr view "$pr_number" --json reviewRequests 2>/dev/null | node_helper requested-reviewers)"; then
    echo "WARN: Failed to read existing review requests for #${pr_number}; skipping stale reviewer removal this run"
    return 0
  fi

  # Remove only teams that are both stale according to the marker and currently requested
  # on GitHub. If a team already reviewed, was dismissed, or was manually removed, including
  # it in the DELETE payload could make the whole best-effort cleanup fail.
  # shellcheck disable=SC2086
  comm -12 \
    <(printf '%s\n' ${stale_teams:-} | sort -u | sed '/^$/d') \
    <(printf '%s\n' ${existing_reviewers:-} | sort -u | sed '/^$/d') | \
    sed -n '/^elastic\//p'
}

best_effort_remove_team_reviewers () {
  local pr_number="$1"
  shift

  if [ "$#" -eq 0 ]; then
    return 0
  fi

  # Strip the `elastic/` prefix; the GitHub API expects bare team slugs in `team_reviewers`.
  # Defensive: skip anything that isn't `elastic/<slug>`. The bot only ever manages teams,
  # so this guard ensures we never accidentally remove a user-level reviewer here.
  local slugs=()
  for r in "$@"; do
    case "$r" in
      elastic/*)
        slugs+=("${r#elastic/}")
        ;;
      *)
        echo "WARN: ignoring non-team reviewer '$r' in stale-reviewer removal"
        ;;
    esac
  done

  if [ "${#slugs[@]}" -eq 0 ]; then
    return 0
  fi

  echo "--- Removing stale team reviewers (best-effort): ${slugs[*]}"

  # Build the JSON payload via jq so unusual characters in slugs are escaped correctly.
  # GitHub's DELETE endpoint requires `reviewers`, even when only teams are removed.
  local payload
  payload="$(printf '%s\n' "${slugs[@]}" | jq -R . | jq -s '{reviewers: [], team_reviewers: .}')"

  if printf '%s' "$payload" | gh api \
    --method DELETE \
    "/repos/{owner}/{repo}/pulls/${pr_number}/requested_reviewers" \
    --input - >/dev/null 2>&1; then
    echo "Removed stale team reviewers: ${slugs[*]}"
  else
    echo "WARN: Failed to remove stale team reviewers (continuing)"
  fi
}

maybe_close_stale_bot_pr () {
  # When managed drift has self-healed on `main` (manual fix, or the rule changed away
  # from `mode: "sync"`), any open bot PR is by definition stale. Close it and delete the
  # branch so its currently-requested reviewers stop seeing it on their dashboards. The
  # next weekly run will re-open a fresh PR if drift returns.
  local stale_pr_json
  local stale_pr_number
  stale_pr_json="$(gh pr list \
    --search "\"${PR_TITLE}\" in:title" \
    --state open \
    --author "$KIBANA_MACHINE_USERNAME" \
    --limit 20 \
    --json number,title 2>/dev/null || echo '[]')"
  stale_pr_number="$(echo "$stale_pr_json" | jq -r --arg title "$PR_TITLE" 'map(select(.title == $title))[0].number // empty')"

  if [ -z "${stale_pr_number:-}" ]; then
    return 0
  fi

  echo "--- Closing stale bot PR #${stale_pr_number} (managed drift resolved on main)"
  # Backticks in the comment string are markdown code formatting, not shell expansion.
  # shellcheck disable=SC2016
  if gh pr close "$stale_pr_number" \
    --delete-branch \
    --comment 'Closing — the managed reviewer drift this PR was tracking has been resolved on `main` (either fixed directly, or the rule was changed away from `mode: "sync"`). This is auto-managed by the renovate-reviewer-sync pipeline; if drift reappears, a new PR will be opened automatically.' \
    >/dev/null 2>&1; then
    echo "Closed stale bot PR #${stale_pr_number} and deleted its branch."
  else
    echo "WARN: Failed to close stale bot PR #${stale_pr_number} (continuing)"
  fi
}

main () {
  cd "$KIBANA_DIR"

  report_main_step "Bootstrapping Kibana"
  .buildkite/scripts/bootstrap.sh

  # Ensure we're on a clean, up-to-date `main` before generating reports and applying changes.
  # Fetch/checkout are best-effort (the agent already starts on main), but `reset --hard` must
  # succeed — a silent failure here would let us operate on stale state.
  git fetch origin main >/dev/null 2>&1 || true
  git checkout main >/dev/null 2>&1 || true
  git reset --hard origin/main >/dev/null

  report_main_step "Analyzing renovate reviewer drift + missing coverage"

  REPORT_JSON="$(mktemp)"
  trap 'rm -f "$REPORT_JSON"' EXIT

  # Single full-repo scan: `--write` applies managed (`mode=sync`) drift to renovate.json
  # (no-op when nothing to apply — the serializer re-writes the file byte-identically) and
  # `--report-json` captures the full report we use for metrics, annotation, and reviewer
  # selection below. `git diff --exit-code` on `$GIT_SCOPE` is the source of truth for
  # whether any real changes were applied.
  node scripts/sync_renovate_reviewers.js --write --report-json "$REPORT_JSON"

  # shellcheck disable=SC2046
  eval "$(node_helper report-metrics "$REPORT_JSON")"

  has_managed_drift=false
  has_untracked=false
  has_no_computed_reviewers=false
  if [ "${managedSyncNeeded:-0}" -gt 0 ] || [ "${managedRuleDrift:-0}" -gt 0 ]; then
    has_managed_drift=true
  fi
  if [ "${untracked:-0}" -gt 0 ]; then
    has_untracked=true
  fi
  if [ "${noComputedReviewers:-0}" -gt 0 ]; then
    has_no_computed_reviewers=true
  fi

  annotation=$'### Renovate Reviewer Sync\n'
  annotation+=$'\n'
  annotation+="- Managed drift (mode=sync): **${managedSyncNeeded:-0}**\n"
  annotation+="- Untracked packages used but not covered by any rule: **${untracked:-0}**\n"
  annotation+="- Rules with no computed reviewers (left unchanged): **${noComputedReviewers:-0}**\n"

  if [ "$has_untracked" = "true" ]; then
    top_untracked="$(node_helper untracked-packages "$REPORT_JSON" 25 || true)"
    annotation+=$'\n'
    annotation+=$'#### Untracked packages (top 25)\n'
    annotation+=$'```\n'
    annotation+="${top_untracked:-}"
    annotation+=$'\n```\n'
  fi

  if [ "$has_no_computed_reviewers" = "true" ]; then
    no_comp_details="$(node_helper no-computed-reviewer-rules "$REPORT_JSON" 25 || true)"
    annotation+=$'\n'
    annotation+=$'#### Rules with no computed reviewers (top 25)\n'
    annotation+=$'```\n'
    annotation+="${no_comp_details:-}"
    annotation+=$'\n```\n'
    annotation+=$'\n'
    annotation+=$'Next step: decide whether to (a) remove the unused dependency, (b) adjust rule selectors, (c) fix CODEOWNERS ownership, or (d) intentionally pin via `mode: \"fixed\"`.\n'
  fi

  if [ "$has_managed_drift" = "false" ] && [ "$has_untracked" = "false" ] && [ "$has_no_computed_reviewers" = "false" ]; then
    # Drift fully resolved (or never existed): close any stale bot PR so its requested
    # reviewers stop seeing it on their dashboards.
    maybe_close_stale_bot_pr
    buildkite_annotate "$annotation" "success"
    echo "No managed drift and no missing coverage detected. Exiting."
    exit 0
  fi

  pr_url=""

  # `--write` already applied any managed drift (or was a no-op). If the working tree is
  # clean, there's nothing to commit — we still surface untracked / no-computed-reviewers
  # signals via an error-styled annotation so they don't go silent. `git diff --exit-code`
  # returns 0 when clean; used directly in `if`, it doesn't trip `set -e`.
  if git diff --exit-code --quiet "$GIT_SCOPE"; then
    if [ "$has_managed_drift" = "true" ]; then
      echo "No changes in $GIT_SCOPE after applying updates."
    fi
    # `git diff` clean means there is no managed-drift commit to push, so any open bot PR
    # is stale even if the build is going red on a different signal (untracked /
    # no-computed-reviewers). Close it before annotating either outcome.
    maybe_close_stale_bot_pr
    if [ "$has_untracked" = "true" ] || [ "$has_no_computed_reviewers" = "true" ]; then
      buildkite_annotate "$annotation" "error"
      exit 1
    fi
    buildkite_annotate "$annotation" "success"
    exit 0
  fi

  report_main_step "Differences found. Checking for an existing pull request."

  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email "$KIBANA_MACHINE_EMAIL"

  PR_BODY=$'This PR syncs `renovate.json` `packageRules[*].reviewers` for rules explicitly opted in via:\n\n- `x_kbn_reviewer_sync.mode: \"sync\"`\n\nThis is generated automatically and is intended to be non-disruptive (report-only rules are not updated).\n'
  if [ -n "${BUILDKITE_BUILD_URL:-}" ]; then
    PR_BODY+=$'\nGenerated by '"${BUILDKITE_BUILD_URL}"$'\n'
  fi

  # Single lookup — pull all fields we need in one API call. `body` lets us read the
  # bot-managed-reviewer-teams marker from the previous run without an extra round-trip.
  existing_pr_json="$(gh pr list --search "\"${PR_TITLE}\" in:title" --state open --author "$KIBANA_MACHINE_USERNAME" --limit 20 --json number,title,url,headRefName,body 2>/dev/null | jq --arg title "$PR_TITLE" 'map(select(.title == $title))[:1]' || echo '[]')"
  existing_pr_number="$(echo "$existing_pr_json" | jq -r '.[0].number // empty')"
  existing_pr_url="$(echo "$existing_pr_json" | jq -r '.[0].url // empty')"
  existing_pr_branch="$(echo "$existing_pr_json" | jq -r '.[0].headRefName // empty')"
  existing_pr_body="$(echo "$existing_pr_json" | jq -r '.[0].body // empty')"

  if [ -n "${existing_pr_number:-}" ]; then
    echo "Existing PR found (#$existing_pr_number). Updating it."
    pr_url="$existing_pr_url"
    BRANCH_NAME="$existing_pr_branch"
  else
    echo "No existing PR found. Creating a new one."
    BRANCH_NAME="renovate_reviewer_sync"
  fi

  # Snapshot the bot-managed team set from the previous run. Empty on first run, on a
  # freshly-opened PR, or after a previous-run body without the marker (older versions of
  # this script). In any of those cases, no removal will happen — we'll just write a fresh
  # marker for the next run to compare against.
  previous_managed_teams=""
  if [ -n "${existing_pr_body:-}" ]; then
    previous_managed_teams="$(extract_marker_teams_from_body "$existing_pr_body" | tr '\n' ' ')"
  fi

  reviewers="$(node_helper reviewers "$REPORT_JSON" || true)"
  mentions="$(node_helper mentions "$REPORT_JSON" || true)"
  if [ -n "${mentions:-}" ]; then
    PR_BODY+=$'\n\nReview requested from computed owners: '"$mentions"$'\n'
  fi

  # Append the bot-managed-reviewer-teams marker so the next run can see exactly which
  # teams the bot itself requested this run. Hidden (HTML comment), so it doesn't render
  # in the PR description.
  if [ -n "${reviewers:-}" ]; then
    PR_BODY+=$'\n'"${BOT_MANAGED_REVIEWERS_MARKER_PREFIX} ${reviewers} ${BOT_MANAGED_REVIEWERS_MARKER_SUFFIX}"$'\n'
  fi

  # Create/update the bot branch on the current (fresh) main, keeping the computed changes in the working tree.
  git checkout -B "$BRANCH_NAME"
  git add "$GIT_SCOPE"
  git commit -m "Sync renovate reviewers"

  report_main_step "Changes committed. Pushing branch."

  # Fetch the remote ref (if any) so `--force-with-lease` has a lease baseline.
  # Works for both fresh branch creation (no remote ref yet, lease is a no-op) and
  # stale-branch overwrite (e.g. a previously closed PR left the remote branch behind).
  git fetch origin "$BRANCH_NAME" >/dev/null 2>&1 || true
  git push origin "$BRANCH_NAME" --force-with-lease

  if [ -n "${existing_pr_number:-}" ]; then
    report_main_step "Updating pull request body"
    if ! gh pr edit "$existing_pr_number" --body "$PR_BODY" >/dev/null 2>&1; then
      echo "WARN: Failed to update PR body marker for #${existing_pr_number} (continuing)"
    fi
    pr_number="$existing_pr_number"
  else
    report_main_step "Creating pull request"
    # Create PR first WITHOUT reviewers so a single invalid/unrequestable team can't block creation.
    pr_url="$(gh pr create \
      --title "$PR_TITLE" \
      --body "$PR_BODY" \
      --base main \
      --head "$BRANCH_NAME" \
      )"

    pr_number="${pr_url##*/}"
  fi

  # TODO(ownership): `Team:Kibana Operations` is a placeholder until we agree on which team
  # owns this weekly signal. The label is metadata only (changeable later) — the runtime
  # pings below are driven purely by CODEOWNERS-derived reviewers.
  best_effort_add_labels "$pr_number" 'release_note:skip' 'backport:skip' 'Team:Kibana Operations'

  # Best-effort: request reviews from CODEOWNERS-derived teams; never fail the job due to
  # reviewer issues. For an existing PR, only request newly-introduced reviewers to avoid
  # re-pinging the same teams weekly.
  reviewers_to_request="$reviewers"
  if [ -n "${existing_pr_number:-}" ]; then
    reviewers_to_request="$(compute_new_reviewers_to_request "$pr_number" "$reviewers" || true)"
  fi

  if [ -n "${reviewers_to_request:-}" ]; then
    # shellcheck disable=SC2086
    best_effort_request_reviewers "$pr_number" $reviewers_to_request
  fi

  # Symmetric counterpart: drop teams the bot itself previously requested but that are no
  # longer in the computed set. The previous-run marker defines what the bot owns; the
  # current GitHub requested-reviewer list keeps the DELETE payload to reviewers that are
  # still pending. That avoids touching humans / human-added teams and avoids failing the
  # whole best-effort DELETE because one stale team already reviewed or was removed.
  if [ -n "${existing_pr_number:-}" ] && [ -n "${previous_managed_teams:-}" ]; then
    teams_to_remove="$(compute_requested_stale_team_reviewers_to_remove "$pr_number" "$previous_managed_teams" "${reviewers:-}" || true)"
    if [ -n "${teams_to_remove:-}" ]; then
      # shellcheck disable=SC2086
      best_effort_remove_team_reviewers "$pr_number" $teams_to_remove
    fi
  fi

  if [ -n "${pr_url:-}" ]; then
    annotation+="- PR: ${pr_url}\n"
  else
    annotation+="- PR: ${existing_pr_url}\n"
  fi

  buildkite_annotate "$annotation" "error"
  exit 1
}

main
