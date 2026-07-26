#!/usr/bin/env bash

set -euo pipefail

echo --- Reconcile PR labels

OLD_VERSION=$(buildkite-agent meta-data get "OLD_VERSION")

echo "Reconciling labels from v${OLD_VERSION} to v${NEW_VERSION}"

SCRIPT_DIR=".buildkite/scripts/steps/version_bump"

echo "Installing dependencies..."
npm ci --prefix ".buildkite"

DRY_RUN_FLAG=""
if [[ "${DRY_RUN:-false}" == "true" ]]; then
  DRY_RUN_FLAG="--dry-run"
fi

echo "Running label-reconcile..."
node "$SCRIPT_DIR/label_reconcile.js" \
  --shipped "v${OLD_VERSION}" \
  --upcoming "v${NEW_VERSION}" \
  ${DRY_RUN_FLAG}

echo "PR label reconciliation complete"
