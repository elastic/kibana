# Sourced by ftr_configs.sh and the Scout runners — do not execute directly.
#
# Forgives test failures for tests that would be skipped had the PR been rebased onto its target
# branch: the failing file is three-way merged (merge base -> PR head vs target branch) and the
# test must be skipped in the result.
# Applies to every PR build; disabled for flaky-test-runner builds.

SKIPPED_ON_MAIN_TARGET_SHA=""

skipped_on_main_applicable() {
  [[ -z "${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}" ]] \
    && [[ -n "${GITHUB_PR_TARGET_BRANCH:-}" ]] \
    && [[ -n "${GITHUB_PR_MERGE_BASE:-}" ]]
}

# Usage: skipped_on_main_skipped <context> <reason>
# Logs why a failure was not evaluated so the log distinguishes "did not run" from "ran and kept".
skipped_on_main_skipped() {
  echo "[skipped-on-main] not evaluating $1: $2 (target=${GITHUB_PR_TARGET_BRANCH:-unset} merge-base=${GITHUB_PR_MERGE_BASE:-unset})"
}

# Resolves the target branch tip once per step. Returns non-zero when it cannot be fetched,
# in which case failures are left untouched.
resolve_skipped_on_main_target() {
  if [[ -n "$SKIPPED_ON_MAIN_TARGET_SHA" ]]; then
    return 0
  fi
  if git fetch --quiet origin "$GITHUB_PR_TARGET_BRANCH" 2>/dev/null; then
    SKIPPED_ON_MAIN_TARGET_SHA="$(git rev-parse FETCH_HEAD)"
    return 0
  fi
  echo "[skipped-on-main] could not fetch origin/$GITHUB_PR_TARGET_BRANCH; leaving failures as-is"
  return 1
}

# Usage: forgive_skipped_on_main_reports <context> <--junit-file|--scout-failures> <marker> <find args...>
# Collects reports matching the find expression that are newer than <marker> (a file created
# just before the run) and evaluates them. Returns 0 when every failure in those reports is
# skipped on the target branch but not at the merge base; the caller then treats the run as
# passed. Annotates the build with the forgiven tests; logs why when it returns non-zero.
forgive_skipped_on_main_reports() {
  local context="$1"
  local report_flag="$2"
  local marker="$3"
  shift 3

  if ! skipped_on_main_applicable; then
    skipped_on_main_skipped "$context" "not a PR build or flaky test runner"
    return 1
  fi

  local report_args=()
  local report_file
  while IFS= read -r report_file; do
    report_args+=("$report_flag" "$report_file")
  done < <(find "$@" -newer "$marker" 2>/dev/null)

  if [[ ${#report_args[@]} -eq 0 ]]; then
    skipped_on_main_skipped "$context" "no report was written (failure happened before tests ran)"
    return 1
  fi

  resolve_skipped_on_main_target || return 1

  echo "--- [skipped-on-main] evaluating failures in $context against $GITHUB_PR_TARGET_BRANCH"
  local evaluation
  if ! evaluation=$(node scripts/check_skipped_on_main \
    --main-ref "$SKIPPED_ON_MAIN_TARGET_SHA" \
    --base-ref "$GITHUB_PR_MERGE_BASE" \
    --head-ref HEAD \
    "${report_args[@]}"); then
    echo "[skipped-on-main] keeping failures for $context"
    return 1
  fi
  if ! echo "$evaluation" | jq -e . >/dev/null 2>&1; then
    echo "[skipped-on-main] evaluator returned invalid JSON; keeping failures for $context"
    return 1
  fi
  # The exit code alone does not flip the step: the classification itself must say every failure
  # is known skipped (at least one, none real) before the caller may treat the run as passed.
  if ! echo "$evaluation" | jq -e \
    '(.knownSkipped | type == "array" and length > 0) and (.real | type == "array" and length == 0)' \
    >/dev/null; then
    echo "[skipped-on-main] evaluator output does not classify every failure as known skipped; keeping failures for $context"
    return 1
  fi

  local forgiven
  forgiven=$(echo "$evaluation" | jq -r '.knownSkipped[] | "- `\(.failure.file)` — \(.failure.fullTitle // "\(.failure.suite) \(.failure.title)")\(if .issue then " (\(.issue))" else "" end)"')

  echo "[skipped-on-main] all failures in $context are skipped on $GITHUB_PR_TARGET_BRANCH since the merge base — treating as passed"
  echo "$forgiven"

  # One build-wide annotation; each forgiven config appends a section. The context must stay
  # short (Buildkite rejects long contexts), so never derive it from paths.
  buildkite-agent annotate --style warning --context skipped-on-main --append <<EOF || echo "[skipped-on-main] failed to annotate build (non-fatal)"
**${context}** ([job](#${BUILDKITE_JOB_ID:-})) — failures ignored because these tests are skipped on \`${GITHUB_PR_TARGET_BRANCH}\` (\`${SKIPPED_ON_MAIN_TARGET_SHA:0:12}\`) but not at the PR merge base (\`${GITHUB_PR_MERGE_BASE:0:12}\`):

${forgiven}

EOF
  return 0
}

# Usage: forgive_skipped_on_main_scout <context> <marker>
# Scout variant: reads the failure NDJSON files the Scout failed-test reporter wrote since <marker>.
forgive_skipped_on_main_scout() {
  forgive_skipped_on_main_reports "$1" --scout-failures "$2" \
    .scout/reports -path '*scout-playwright-test-failures-*' -name 'scout-failures-*.ndjson'
}
