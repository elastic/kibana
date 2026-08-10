#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check connector specs release

if ! is_pr; then
  echo "Not a PR build; skipping connector spec release check."
  exit 0
fi

# Production-NonCanary only tracks main, so the policy is meaningless on other targets.
if [[ "${GITHUB_PR_TARGET_BRANCH:-}" != "main" ]]; then
  echo "PR does not target main; skipping connector spec release check."
  exit 0
fi

# Advisory 2-step release check. This NEVER fails the build; it checks the policy and
# posts an advisory PR comment. The runner resolves the Production-NonCanary versions
# itself — the `scripts/get_serverless_release_sha` helper resolves QA, not PNC.
REPORT_PATH="$(mktemp -t connector-release-report.XXXXXX).json"
node .buildkite/scripts/steps/checks/run_connector_release_check.js \
  --report-path "$REPORT_PATH" \
  --base-ref "${GITHUB_PR_MERGE_BASE:-}"

echo --- Post connector spec release PR comment
ts-node .buildkite/scripts/steps/checks/notify_connector_specs_changes.ts --report-path "$REPORT_PATH" \
  || echo "Warning: failed to post connector spec release PR comment"

exit 0
