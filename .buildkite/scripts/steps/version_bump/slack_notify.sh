#!/usr/bin/env bash

set -euo pipefail

echo --- Notify Slack that branch has been created

SCRIPT_DIR=".buildkite/scripts/steps/version_bump"

DRY_RUN_FLAG=""
if [[ "${DRY_RUN:-false}" == "true" ]]; then
  DRY_RUN_FLAG="--dry-run"
fi

echo "Running slack_release_notify.js for v${NEW_VERSION} (${WORKFLOW})..."
node "$SCRIPT_DIR/slack_release_notify.js" \
  --version "${NEW_VERSION}" \
  --type "${WORKFLOW}" \
  ${DRY_RUN_FLAG}

echo "Slack notification sent"
