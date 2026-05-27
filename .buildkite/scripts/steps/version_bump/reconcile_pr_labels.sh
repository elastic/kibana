#!/usr/bin/env bash

set -euo pipefail

echo --- Reconcile PR labels

OLD_VERSION=$(buildkite-agent meta-data get "OLD_VERSION")

echo "Reconciling labels from v${OLD_VERSION} to v${NEW_VERSION}"

# Clone kibana-operations repo to get the label-reconcile script
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Cloning elastic/kibana-operations..."
git clone --depth 1 "https://x-access-token:${GITHUB_TOKEN}@github.com/elastic/kibana-operations.git" "$TEMP_DIR/kibana-operations"

echo "Installing triage dependencies..."
npm ci --prefix "$TEMP_DIR/kibana-operations/triage"

DRY_RUN_FLAG=""
if [[ "${DRY_RUN:-false}" == "true" ]]; then
  DRY_RUN_FLAG="--dry-run"
fi

echo "Running label-reconcile..."
node "$TEMP_DIR/kibana-operations/triage/label-reconcile.js" \
  --shipped "v${OLD_VERSION}" \
  --upcoming "v${NEW_VERSION}" \
  ${DRY_RUN_FLAG}

echo "PR label reconciliation complete"
