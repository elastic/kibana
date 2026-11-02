#!/usr/bin/env bash

set -euo pipefail

echo --- Ensure version label exists

# For minor/major bumps, NEW_VERSION is the next dev version for main (e.g., 9.5.0)
# We need to ensure the label for this version exists
LABEL_NAME="v${NEW_VERSION}"
LABEL_COLOR="ffffff"

echo "Ensuring label '${LABEL_NAME}' exists with color #${LABEL_COLOR}"

# Try edit first (succeeds if label already exists), fall back to create
if gh label edit "${LABEL_NAME}" --repo elastic/kibana --color "${LABEL_COLOR}" 2>/dev/null; then
  echo "Label '${LABEL_NAME}' already exists, updated color"
elif gh label create "${LABEL_NAME}" --repo elastic/kibana --color "${LABEL_COLOR}" --description "Version ${NEW_VERSION}" 2>/dev/null; then
  echo "Label '${LABEL_NAME}' created"
else
  echo "Warning: failed to create or update label '${LABEL_NAME}'" >&2
  exit 1
fi
