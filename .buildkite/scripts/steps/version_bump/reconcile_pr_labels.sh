#!/usr/bin/env bash

set -euo pipefail

echo --- Reconcile PR labels

# Derive the previous patch version from NEW_VERSION
# e.g., 9.2.5 -> 9.2.4
MAJOR=$(echo "$NEW_VERSION" | cut -d. -f1)
MINOR=$(echo "$NEW_VERSION" | cut -d. -f2)
PATCH=$(echo "$NEW_VERSION" | cut -d. -f3)

if [ "$PATCH" -le 0 ]; then
  echo "Patch version is 0, nothing to reconcile"
  exit 0
fi

OLD_PATCH=$((PATCH - 1))
OLD_VERSION="${MAJOR}.${MINOR}.${OLD_PATCH}"

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
