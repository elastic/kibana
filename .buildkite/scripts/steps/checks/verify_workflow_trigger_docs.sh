#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Verify workflow trigger docs

# This generator requires Kibana to be running and the workflows app to have been
# loaded at least once (so the public plugin has pushed trigger doc metadata).
# When KIBANA_URL is not set, skip so quick_checks and other jobs that don't
# start Kibana don't fail. To enforce this doc in CI, run this step in a job
# that has started Kibana and loaded the workflows app (e.g. after Scout tests),
# with KIBANA_URL and KIBANA_AUTH set.
if [[ -z "${KIBANA_URL:-}" ]]; then
  echo "KIBANA_URL not set; skipping workflow trigger docs generation."
  echo "To regenerate the doc locally, run: node scripts/generate workflow-trigger-docs"
  exit 0
fi

if ! is_pr; then
  echo "Not a PR build, skipping."
  exit 0
fi

node scripts/generate workflow-trigger-docs
check_for_changed_files "node scripts/generate workflow-trigger-docs" true "Update workflow trigger docs"
