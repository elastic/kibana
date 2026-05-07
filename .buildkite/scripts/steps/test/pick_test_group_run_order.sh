#!/usr/bin/env bash

set -euo pipefail

# This step only runs a Node.js script to compute test group ordering;
# it never needs the dev-mode shared webpack bundles (monaco, ui-shared-deps).
export KBN_BOOTSTRAP_NO_PREBUILT=true

source .buildkite/scripts/bootstrap.sh

# Tests-only Jest/FTR skip (PR-only, label-gated):
# Only resolve the Scout testing scope when the diff *could* lead to a skip —
# i.e. on a PR build with the 'ci:skip-non-scout-tests' label. Otherwise the
# resolver call is pure overhead, since no scope value would change Jest/FTR
# behaviour. The .ts script below treats a missing artifact as "do nothing".
#
# We resolve here (instead of downloading the Scout step's artifact) because
# `pick_test_group_run_order` runs in parallel with `scout/test_run_builder`.
if [[ -n "${GITHUB_PR_NUMBER:-}" ]] && is_pr_with_label "ci:skip-non-scout-tests"; then
  echo "Label 'ci:skip-non-scout-tests' present — resolving Scout testing scope to gate Jest/FTR"

  # PR builds: GITHUB_PR_MERGE_BASE comes from set_git_merge_base() in util.sh.
  # Should always be set here (we already gated on GITHUB_PR_NUMBER), but fall
  # back defensively to HEAD~1 to avoid hard-failing this preamble.
  export AFFECTED_MERGE_BASE="${GITHUB_PR_MERGE_BASE:-HEAD~1}"

  mkdir -p .scout
  export CODE_CHANGES_FILE=".scout/code_changes.json"
  export TESTING_SCOPE_FILE=".scout/testing_scope.json"

  # TEMP — REMOVE BEFORE MERGE: stub a tests-only diff so CI exercises the
  # Jest/FTR skip regardless of what's actually in the PR. Must match the stub
  # in `scout/test_run_builder.sh` so both agents resolve the same scope.
  cat > "$CODE_CHANGES_FILE" <<'EOF'
{
  "mergeBase": "ci-stub-tests-only",
  "changedFiles": [
    "x-pack/platform/plugins/private/discover_enhanced/test/scout/ui/parallel_tests/saved_searches.spec.ts"
  ],
  "affectedModules": ["@kbn/discover-enhanced-plugin"]
}
EOF
  echo "Using stubbed code_changes.json (CI verification — REMOVE BEFORE MERGE)"
  cat "$CODE_CHANGES_FILE"

  # Real bridge disabled while the stub is in place.
  # ts-node .buildkite/scripts/steps/test/scout/resolve_selective_testing.ts

  node scripts/scout resolve-testing-scope \
    --code-changes "$CODE_CHANGES_FILE" \
    --scope-output "$TESTING_SCOPE_FILE" \
    --selective-testing \
    --allow-skip-non-scout-tests
fi

echo '--- Pick Test Group Run Order'
ts-node "$(dirname "${0}")/pick_test_group_run_order.ts"
