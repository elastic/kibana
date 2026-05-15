#!/usr/bin/env bash

set -euo pipefail

echo --- Notify Slack that branch has been created

# Clone kibana-operations repo to get the slack/release/notify.js script
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Cloning elastic/kibana-operations..."
git clone --depth 1 "https://x-access-token:${GITHUB_TOKEN}@github.com/elastic/kibana-operations.git" "$TEMP_DIR/kibana-operations"

echo "Installing slack/release dependencies..."
npm ci --prefix "$TEMP_DIR/kibana-operations/slack/release"

DRY_RUN_FLAG=""
if [[ "${DRY_RUN:-false}" == "true" ]]; then
  DRY_RUN_FLAG="--dry-run"
fi

echo "Running slack/release/notify.js for v${NEW_VERSION} (${WORKFLOW})..."
node "$TEMP_DIR/kibana-operations/slack/release/notify.js" \
  --version "${NEW_VERSION}" \
  --type "${WORKFLOW}" \
  ${DRY_RUN_FLAG}

echo "Slack notification sent"
