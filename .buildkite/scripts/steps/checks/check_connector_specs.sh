#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check connector specs release manifest

if ! is_pr; then
  echo "Not a PR build; skipping connector spec release check."
  exit 0
fi

# 1. Freshness (self-healing): keep the committed manifest in sync with the specs.
#    check_for_changed_files auto-commits the regenerated manifest when auto-commit
#    is enabled (the default), so a forgotten `node scripts/generate_connector_manifest`
#    is fixed by the bot rather than blocking the author.
node scripts/generate_connector_manifest
check_for_changed_files "node scripts/generate_connector_manifest" true

# 2. Advisory 2-step release policy check. This NEVER fails the build — it only
#    posts/updates a PR comment. The comparison target is the current serverless
#    release SHA (rollback-safe), scoped by the merge-base to this PR's changes.
RELEASED_REF=""
if [[ "${GITHUB_PR_TARGET_BRANCH:-}" == "main" ]]; then
  if RELEASED_REF="$(node scripts/get_serverless_release_sha)"; then
    git fetch --quiet --depth=1 origin "$RELEASED_REF" \
      || echo "Warning: could not fetch release SHA $RELEASED_REF; release check will fail open."
  else
    echo "Warning: could not resolve serverless release SHA; release check will fail open."
    RELEASED_REF=""
  fi
fi

REPORT_PATH="$(mktemp -t connector-release-report.XXXXXX).json"
node .buildkite/scripts/steps/checks/run_connector_release_check.js \
  --report-path "$REPORT_PATH" \
  --base-ref "${GITHUB_PR_MERGE_BASE:-}" \
  --released-ref "$RELEASED_REF"

echo --- Post connector spec release PR comment
ts-node .buildkite/scripts/steps/checks/notify_connector_specs_changes.ts --report-path "$REPORT_PATH" \
  || echo "Warning: failed to post connector spec release PR comment"

exit 0
