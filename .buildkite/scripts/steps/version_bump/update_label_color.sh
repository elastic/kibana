#!/usr/bin/env bash

set -euo pipefail

echo --- Update label color for released version

LABEL_NAME="v${NEW_VERSION}"
LABEL_COLOR="dddddd"

if [[ "${DRY_RUN:-}" == "true" ]]; then
  echo "DRY_RUN: would set color of label '${LABEL_NAME}' to #${LABEL_COLOR} (creating it if missing)"
  exit 0
fi

echo "Setting color of label '${LABEL_NAME}' to #${LABEL_COLOR}"

# Try edit first (succeeds if label already exists), fall back to create.
if gh label edit "${LABEL_NAME}" --repo elastic/kibana --color "${LABEL_COLOR}" 2>/dev/null; then
  echo "Label '${LABEL_NAME}' updated successfully"
elif gh label create "${LABEL_NAME}" --repo elastic/kibana --color "${LABEL_COLOR}" --description "Version ${NEW_VERSION}" 2>/dev/null; then
  echo "Label '${LABEL_NAME}' did not exist; created with color #${LABEL_COLOR}"
else
  echo "Error: failed to create or update label '${LABEL_NAME}'" >&2
  exit 1
fi
