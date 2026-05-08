#!/usr/bin/env bash

set -euo pipefail

echo --- Reconcile PR labels

OLD_VERSION=$(buildkite-agent meta-data get "OLD_VERSION")

echo "Reconciling labels from v${OLD_VERSION} to v${NEW_VERSION}"

# Clone kibana-operations repo to get the label-reconcile script
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Cloning elastic/kibana-operations..."
git clone --depth 1 https://github.com/elastic/kibana-operations.git "$TEMP_DIR/kibana-operations"

echo "Running label-reconcile..."
node "$TEMP_DIR/kibana-operations/triage/label-reconcile.js" \
  --from "v${OLD_VERSION}" \
  --to "v${NEW_VERSION}" \
  --old-label "v${OLD_VERSION}" \
  --new-label "v${NEW_VERSION}"

echo "PR label reconciliation complete"
