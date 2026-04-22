#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Verify workflow step docs

# This generator requires Kibana to be running and the workflows app to have been
# loaded at least once (so the public plugin has pushed step doc metadata).
# When KIBANA_URL is not set, skip so quick_checks and other jobs that don't
# start Kibana don't fail.
if [[ -z "${KIBANA_URL:-}" ]]; then
  echo "KIBANA_URL not set; skipping workflow step docs generation."
  echo "To regenerate the doc locally, run: node scripts/generate workflow-step-docs"
  exit 0
fi

if ! is_pr; then
  echo "Not a PR build, skipping."
  exit 0
fi

node scripts/generate workflow-step-docs
check_for_changed_files "node scripts/generate workflow-step-docs" true "Update workflow step docs"
