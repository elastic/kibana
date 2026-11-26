#!/usr/bin/env bash
set -euo pipefail

# Compares the connectors' committed vendor_api artifacts with the vendors' latest specs
# (`node scripts/connector_vendor_api --drift`), files or updates a GitHub issue per connector
# that needs one and closes those of connectors healthy again (`--surface`), and refreshes the
# artifacts of connectors with only non-breaking changes in a single bot PR.
#
# CONNECTOR_VENDOR_API_CONNECTOR checks one connector (a metadata.id) instead of all of them.
# CONNECTOR_VENDOR_API_GITHUB_REPO selects the mode:
#   - empty: dry run against elastic/kibana, the issues are read and the would-be writes logged,
#     nothing is written and no PR is opened;
#   - a sandbox repository: issues are filed there, no PR is opened;
#   - elastic/kibana: live, issues and the refresh PR.
# GITHUB_TOKEN (kibanamachine) comes from Vault via .buildkite/scripts/common/setup_job_env.sh.

source .buildkite/scripts/common/util.sh

cd "${KIBANA_DIR:-$(pwd)}"

CONNECTOR="${CONNECTOR_VENDOR_API_CONNECTOR:-}"
TARGET_REPO="${CONNECTOR_VENDOR_API_GITHUB_REPO:-}"

REPORT_DIR="target/connector_vendor_api"
REPORT_PATH="$REPORT_DIR/drift.json"
SUMMARY_PATH="$REPORT_DIR/drift_summary.json"
SPECS_DIR="src/platform/packages/shared/kbn-connector-specs/src/specs"
REFRESH_BRANCH="connector-vendor-api-refresh"
REFRESH_TITLE="[Connector validation] Refresh vendor API artifacts"
ISSUE_LABEL="connector-validation"

if [[ -z "$TARGET_REPO" ]]; then
  MODE="dry run"
  GITHUB_REPO="elastic/kibana"
  DRY_RUN_ARGS=(--dry-run)
elif [[ "$TARGET_REPO" == "elastic/kibana" ]]; then
  MODE="live"
  GITHUB_REPO="$TARGET_REPO"
  DRY_RUN_ARGS=()
else
  MODE="sandbox"
  GITHUB_REPO="$TARGET_REPO"
  DRY_RUN_ARGS=()
fi

# The agent image's oasdiff (1.11.10, also used by @kbn/api-contracts) reports a change once per
# path through a recursive schema, which runs to over 50 MB for PostHog and SharePoint Online, and
# it classifies some changes more leniently (a new response enum value is only a warning). The
# check was built with 1.37.0, so the step installs that release. OASDIFF_BIN overrides it.
OASDIFF_RELEASE="1.37.0"
OASDIFF_SHA256="eac87307d31d08c36800c58a409c247f1c5db37fbb72e2544402f22a87cbca3c"
if [[ -z "${OASDIFF_BIN:-}" ]]; then
  echo "--- Install oasdiff $OASDIFF_RELEASE"
  oasdiff_dir="$(mktemp -d)"
  # The step runs on amd64 agents (n2-standard-4)
  curl --retry 8 -fsSL -o "$oasdiff_dir/oasdiff.tar.gz" \
    "https://github.com/oasdiff/oasdiff/releases/download/v${OASDIFF_RELEASE}/oasdiff_${OASDIFF_RELEASE}_linux_amd64.tar.gz"
  echo "$OASDIFF_SHA256  $oasdiff_dir/oasdiff.tar.gz" | sha256sum -c -
  tar -xzf "$oasdiff_dir/oasdiff.tar.gz" -C "$oasdiff_dir" oasdiff
  OASDIFF_BIN="$oasdiff_dir/oasdiff"
fi
export OASDIFF_BIN

# Without oasdiff every changed spec is unclassified, and gets an issue
if ! command -v "$OASDIFF_BIN" > /dev/null; then
  echo "oasdiff ($OASDIFF_BIN) is not available"
  exit 1
fi
OASDIFF_VERSION="$("$OASDIFF_BIN" --version 2>&1 | head -n 1)"
echo "Using $OASDIFF_VERSION"

echo "--- Bootstrap Kibana"
# The step only runs Node scripts; skip building the dev-mode shared webpack bundles
export KBN_BOOTSTRAP_NO_PREBUILT=true
.buildkite/scripts/bootstrap.sh

# The check loads every source's full vendor spec, and one Microsoft Graph connector alone peaks
# at about 5.5 GB, above the 4 GB CI sets for every job. The agent has 16 GB. The last
# --max-old-space-size wins, so this overrides the CI default without dropping other options.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192"

echo "+++ Detect vendor API drift"
drift_args=(--drift --report "$REPORT_PATH")
if [[ -n "$CONNECTOR" ]]; then
  drift_args+=(--connector "$CONNECTOR")
fi
node scripts/connector_vendor_api "${drift_args[@]}"
buildkite-agent artifact upload "$REPORT_PATH"

if [[ "$MODE" != "dry run" ]]; then
  # Later runs find their issues by this label (DRIFT_ISSUE_LABEL in surface_drift.ts)
  if ! gh api "repos/$GITHUB_REPO/labels/$ISSUE_LABEL" > /dev/null 2>&1; then
    gh label create "$ISSUE_LABEL" --repo "$GITHUB_REPO" --description "Filed by the connector vendor API drift pipeline"
  fi
fi

echo "+++ Surface drift in $GITHUB_REPO ($MODE)"
surface_args=(--surface --report "$REPORT_PATH" --summary "$SUMMARY_PATH" --github-repo "$GITHUB_REPO")
if [[ ${#DRY_RUN_ARGS[@]} -gt 0 ]]; then
  surface_args+=("${DRY_RUN_ARGS[@]}")
fi
# Fails after handling every connector when the check or a GitHub write failed for one;
# annotate first, then fail the step
exit_code=0
node scripts/connector_vendor_api "${surface_args[@]}" || exit_code=$?
if [[ ! -f "$SUMMARY_PATH" ]]; then
  echo "No summary was written, surfacing failed before handling any connector"
  exit "$exit_code"
fi
buildkite-agent artifact upload "$SUMMARY_PATH"

refresh_pr=""
mapfile -t refresh_connectors < <(jq -r '.refresh[]' "$SUMMARY_PATH")
if [[ ${#refresh_connectors[@]} -gt 0 ]]; then
  echo "+++ Refresh the artifacts of ${refresh_connectors[*]}"
  # Each refresh is staged, so a failing one is undone without undoing the others
  for connector in "${refresh_connectors[@]}"; do
    if node scripts/connector_vendor_api --connector "$connector" --refresh; then
      git add -- "$SPECS_DIR"
    else
      echo "Refreshing $connector failed, leaving it out of the PR"
      git checkout -- "$SPECS_DIR"
      git clean -fdq -- "$SPECS_DIR"
      exit_code=1
    fi
  done

  if git diff --cached --quiet -- "$SPECS_DIR"; then
    echo "The refresh changed no artifacts"
  elif [[ "$MODE" != "live" ]]; then
    echo "Not opening the refresh PR in a $MODE; it would change:"
    git diff --cached --stat -- "$SPECS_DIR"
  elif [[ -n "$CONNECTOR" ]]; then
    # The PR covers every connector; rebuilding it from one would drop the others
    echo "Not updating the refresh PR from a run of only $CONNECTOR; it would change:"
    git diff --cached --stat -- "$SPECS_DIR"
  else
    git config --global user.name kibanamachine
    git config --global user.email '42973632+kibanamachine@users.noreply.github.com'
    jq -r '.refreshPrBody' "$SUMMARY_PATH" > "$REPORT_DIR/refresh_pr_body.md"

    # One bot PR, rebuilt from main on every run
    git checkout -B "$REFRESH_BRANCH"
    git commit -m "$REFRESH_TITLE" -m "Generated by the connector vendor API drift pipeline: $BUILDKITE_BUILD_URL"
    git push --force origin "$REFRESH_BRANCH"

    refresh_pr="$(gh pr list --repo "$GITHUB_REPO" --head "$REFRESH_BRANCH" --state open --json url -q '.[0].url')"
    if [[ -n "$refresh_pr" ]]; then
      gh pr edit "$refresh_pr" --body-file "$REPORT_DIR/refresh_pr_body.md"
    else
      refresh_pr="$(gh pr create \
        --repo "$GITHUB_REPO" \
        --base main \
        --head "$REFRESH_BRANCH" \
        --title "$REFRESH_TITLE" \
        --body-file "$REPORT_DIR/refresh_pr_body.md" \
        --label 'release_note:skip' \
        --label 'backport:skip')"
    fi
  fi
fi

# With nothing to refresh, an earlier PR's artifacts are outdated and shouldn't be merged. A run of
# one connector or a run with failures doesn't know that about every connector.
if [[ "$MODE" == "live" && -z "$CONNECTOR" && "$exit_code" == "0" && -z "$refresh_pr" ]]; then
  stale_pr="$(gh pr list --repo "$GITHUB_REPO" --head "$REFRESH_BRANCH" --state open --json url -q '.[0].url')"
  if [[ -n "$stale_pr" ]]; then
    echo "Closing the outdated refresh PR $stale_pr"
    gh pr close "$stale_pr" --comment "The drift check found nothing left to refresh: $BUILDKITE_BUILD_URL"
  fi
fi

echo "--- Annotate build"
style="success"
if [[ "$MODE" == "dry run" ]]; then
  style="info"
fi
if [[ "$exit_code" != "0" ]]; then
  style="error"
fi
{
  echo "Vendor API drift in \`${GITHUB_REPO}\` (${MODE}, ${OASDIFF_VERSION}):"
  echo
  jq -r '.actions[]
    | "- `\(.connector)`: \(.action)"
      + (if .issue then " [#\(.issue.number)](\(.issue.url))" else "" end)
      + (if .error then ": \(.error)" else "" end)' "$SUMMARY_PATH"
  if [[ -n "$refresh_pr" ]]; then
    echo
    echo "Refresh PR: $refresh_pr"
  fi
  echo
  echo "Report: <a href=\"artifact://${REPORT_PATH}\">${REPORT_PATH}</a>"
} | buildkite-agent annotate --style "$style" --context connector-vendor-api-drift

exit "$exit_code"
