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

node_report_metrics () {
  local report_path="$1"

  node - "$report_path" <<'NODE'
const fs = require('fs');

const reportPath = process.argv[2];
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const managedRuleDrift = Array.isArray(report.managedRuleDrift) ? report.managedRuleDrift : [];
const managedSyncNeeded = Number.isFinite(report.managedSyncNeeded)
  ? report.managedSyncNeeded
  : managedRuleDrift.length;

const packagesUsedButNotCovered = Array.isArray(report.packagesUsedButNotCovered)
  ? report.packagesUsedButNotCovered
  : [];

const rulesWithNoComputedReviewers = Number.isFinite(report.rulesWithNoComputedReviewers)
  ? report.rulesWithNoComputedReviewers
  : 0;

const safeInt = (n) => {
  const i = Number.parseInt(String(n), 10);
  return Number.isFinite(i) && i >= 0 ? i : 0;
};

process.stdout.write(
  `managedSyncNeeded=${safeInt(managedSyncNeeded)}\n` +
  `managedRuleDrift=${safeInt(managedRuleDrift.length)}\n` +
  `untracked=${safeInt(packagesUsedButNotCovered.length)}\n` +
  `noComputedReviewers=${safeInt(rulesWithNoComputedReviewers)}\n`
);
NODE
}

node_print_untracked_packages () {
  local report_path="$1"
  local limit="${2:-25}"

  node - "$report_path" "$limit" <<'NODE'
const fs = require('fs');

const reportPath = process.argv[2];
const limit = Number.parseInt(process.argv[3], 10);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const pkgs = Array.isArray(report.packagesUsedButNotCovered) ? report.packagesUsedButNotCovered : [];
const out = pkgs.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 25);
process.stdout.write(out.join('\n'));
NODE
}

node_print_no_computed_reviewer_rules () {
  local report_path="$1"
  local limit="${2:-25}"

  node - "$report_path" "$limit" <<'NODE'
const fs = require('fs');

const reportPath = process.argv[2];
const limit = Number.parseInt(process.argv[3], 10);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const details = Array.isArray(report.rulesWithNoComputedReviewersDetails)
  ? report.rulesWithNoComputedReviewersDetails
  : [];

const lim = Number.isFinite(limit) && limit > 0 ? limit : 25;
const slice = details.slice(0, lim);

const fmt = (d) => {
  const idx = typeof d.index === 'number' ? d.index : '?';
  const groupName = typeof d.groupName === 'string' && d.groupName.length > 0 ? d.groupName : null;
  const header = groupName ? `"${groupName}"` : `rule[${idx}]`;
  const mode = typeof d.mode === 'string' ? d.mode : 'unknown';
  const pkgs = Array.isArray(d.packages) ? d.packages : [];
  const before = Array.isArray(d.before) ? d.before : [];
  const pkgsStr = pkgs.length <= 6 ? pkgs.join(', ') : `${pkgs.slice(0, 6).join(', ')}, …(+${pkgs.length - 6})`;
  const beforeStr = before.length === 0 ? '(no reviewers set)' : before.join(', ');
  return `${header} (${mode}) packages: ${pkgsStr} | existing reviewers: ${beforeStr}`;
};

process.stdout.write(slice.map(fmt).join('\n'));
NODE
}

node_print_reviewers () {
  local report_path="$1"

  node - "$report_path" <<'NODE'
const fs = require('fs');

const reportPath = process.argv[2];
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const drifts = Array.isArray(report.managedRuleDrift) ? report.managedRuleDrift : [];

const reviewers = new Set();
for (const d of drifts) {
  const after = Array.isArray(d.after) ? d.after : [];
  for (const r of after) {
    if (typeof r === 'string' && r.startsWith('team:')) {
      reviewers.add(`elastic/${r.slice('team:'.length)}`);
    }
  }
}

process.stdout.write(Array.from(reviewers).sort().join(' '));
NODE
}

node_print_requested_reviewers () {
  # Reads `gh pr view --json reviewRequests` from stdin and prints one reviewer per line in the
  # same format `node_print_reviewers` emits, so the two sets can be set-differenced:
  #   - teams  -> `elastic/<slug>`   (gh returns `slug` without the org prefix for teams)
  #   - users  -> `<login>`
  #
  # Note: we pass the script via process substitution (`<(cat <<NODE ... NODE)`) rather than
  # `node - <<NODE`. The latter would make the heredoc itself be node's stdin, leaving the
  # caller's piped JSON unreadable.
  node <(cat <<'NODE'
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const data = input.trim() ? JSON.parse(input) : {};
  const reqs = Array.isArray(data.reviewRequests) ? data.reviewRequests : [];
  const entries = reqs
    .map((r) => {
      if (!r || typeof r !== 'object') return null;
      // `slug` identifies teams (bare slug, e.g. `kibana-operations`); `login` identifies users.
      // Prefix team slugs with `elastic/` so they match the format used by the computed set and
      // by `gh pr edit --add-reviewer`.
      if (typeof r.slug === 'string') return `elastic/${r.slug}`;
      if (typeof r.login === 'string') return r.login;
      return null;
    })
    .filter(Boolean);
  process.stdout.write(entries.join('\n'));
});
NODE
)
}

node_print_mentions () {
  local report_path="$1"

  node - "$report_path" <<'NODE'
const fs = require('fs');

const reportPath = process.argv[2];
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const drifts = Array.isArray(report.managedRuleDrift) ? report.managedRuleDrift : [];

const mentions = new Set();
for (const d of drifts) {
  const after = Array.isArray(d.after) ? d.after : [];
  for (const r of after) {
    if (typeof r === 'string' && r.startsWith('team:')) {
      mentions.add(`@elastic/${r.slice('team:'.length)}`);
    }
  }
}

process.stdout.write(Array.from(mentions).sort().join(' '));
NODE
}

compute_new_reviewers_to_request () {
  local pr_number="$1"
  local computed_reviewers="$2"

  if [ -z "${computed_reviewers:-}" ]; then
    return 0
  fi

  local existing_reviewers
  existing_reviewers="$(gh pr view "$pr_number" --json reviewRequests 2>/dev/null | node_print_requested_reviewers || true)"

  # Use sorted set difference: computed - existing.
  # The computed side is a space-separated string; we intentionally word-split it into one
  # line per reviewer. The existing side is already newline-separated from
  # `node_print_requested_reviewers`, so it stays quoted.
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
  eval "$(node_report_metrics "$REPORT_JSON")"

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
    top_untracked="$(node_print_untracked_packages "$REPORT_JSON" 25 || true)"
    annotation+=$'\n'
    annotation+=$'#### Untracked packages (top 25)\n'
    annotation+=$'```\n'
    annotation+="${top_untracked:-}"
    annotation+=$'\n```\n'
  fi

  if [ "$has_no_computed_reviewers" = "true" ]; then
    no_comp_details="$(node_print_no_computed_reviewer_rules "$REPORT_JSON" 25 || true)"
    annotation+=$'\n'
    annotation+=$'#### Rules with no computed reviewers (top 25)\n'
    annotation+=$'```\n'
    annotation+="${no_comp_details:-}"
    annotation+=$'\n```\n'
    annotation+=$'\n'
    annotation+=$'Next step: decide whether to (a) remove the unused dependency, (b) adjust rule selectors, (c) fix CODEOWNERS ownership, or (d) intentionally pin via `mode: \"fixed\"`.\n'
  fi

  if [ "$has_managed_drift" = "false" ] && [ "$has_untracked" = "false" ] && [ "$has_no_computed_reviewers" = "false" ]; then
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

  PR_TITLE='[Renovate] Sync reviewers for managed rules'
  PR_BODY=$'This PR syncs `renovate.json` `packageRules[*].reviewers` for rules explicitly opted in via:\n\n- `x_kbn_reviewer_sync.mode: \"sync\"`\n\nThis is generated automatically and is intended to be non-disruptive (report-only rules are not updated).\n'
  if [ -n "${BUILDKITE_BUILD_URL:-}" ]; then
    PR_BODY+=$'\nGenerated by '"${BUILDKITE_BUILD_URL}"$'\n'
  fi

  # Single lookup — pull all fields we need in one API call.
  existing_pr_json="$(gh pr list --search "$PR_TITLE" --state open --author "$KIBANA_MACHINE_USERNAME" --limit 1 --json number,url,headRefName 2>/dev/null || echo '[]')"
  existing_pr_number="$(echo "$existing_pr_json" | jq -r '.[0].number // empty')"
  existing_pr_url="$(echo "$existing_pr_json" | jq -r '.[0].url // empty')"
  existing_pr_branch="$(echo "$existing_pr_json" | jq -r '.[0].headRefName // empty')"

  if [ -n "${existing_pr_number:-}" ]; then
    echo "Existing PR found (#$existing_pr_number). Updating it."
    pr_url="$existing_pr_url"
    BRANCH_NAME="$existing_pr_branch"
  else
    echo "No existing PR found. Creating a new one."
    BRANCH_NAME="renovate_reviewer_sync"
  fi

  reviewers="$(node_print_reviewers "$REPORT_JSON" || true)"
  mentions="$(node_print_mentions "$REPORT_JSON" || true)"
  if [ -n "${mentions:-}" ]; then
    PR_BODY+=$'\n\nReview requested from computed owners: '"$mentions"$'\n'
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
    gh pr edit "$existing_pr_number" --body "$PR_BODY" >/dev/null 2>&1 || true
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

  if [ -n "${pr_url:-}" ]; then
    annotation+="- PR: ${pr_url}\n"
  else
    annotation+="- PR: ${existing_pr_url}\n"
  fi

  buildkite_annotate "$annotation" "error"
  exit 1
}

main
