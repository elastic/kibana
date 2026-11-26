#!/usr/bin/env bash

set -euo pipefail

echo --- Reconcile PR labels

# Derived from NEW_VERSION rather than the pre-bump package.json, which a re-run reads as already bumped.
IFS=. read -r major minor patch <<< "$NEW_VERSION"
if [[ ! "$patch" =~ ^[1-9][0-9]*$ ]]; then
  echo "Cannot derive the shipped version from NEW_VERSION=${NEW_VERSION}: expected a patch version greater than 0" >&2
  exit 1
fi
OLD_VERSION="${major}.${minor}.$((patch - 1))"

echo "Reconciling labels from v${OLD_VERSION} to v${NEW_VERSION}"

SCRIPT_DIR=".buildkite/scripts/steps/version_bump"

echo "Installing dependencies..."
npm ci --prefix ".buildkite"

DRY_RUN_FLAG=""
if [[ "${DRY_RUN:-false}" == "true" ]]; then
  DRY_RUN_FLAG="--dry-run"
fi

echo "Running label-reconcile..."
node "$SCRIPT_DIR/label_reconcile.cjs" \
  --shipped "v${OLD_VERSION}" \
  --upcoming "v${NEW_VERSION}" \
  ${DRY_RUN_FLAG}

echo "PR label reconciliation complete"
