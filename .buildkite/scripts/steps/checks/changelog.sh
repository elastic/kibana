#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Generate changelog entry

if ! is_pr; then
  echo "Not a PR build, skipping"
  exit 0
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Missing GITHUB_TOKEN, skipping"
  exit 0
fi

if [[ "${GITHUB_PR_TARGET_BRANCH:-}" != "main" ]]; then
  echo "Target branch is not main (${GITHUB_PR_TARGET_BRANCH:-}), skipping"
  exit 0
fi

if is_auto_commit_disabled; then
  echo "Auto-commit disabled (ci:no-auto-commit), skipping"
  exit 0
fi

# If there's already a changelog entry for this PR, then exit gracefully
expected_file="docs/changelog/${GITHUB_PR_NUMBER:-}.yaml"
if [ -f "$expected_file" ]; then
  echo "Changelog ${expected_file} already exists, skipping"
  exit 0
fi

# Find the release_note label
IFS=',' read -ra labels <<< "${GITHUB_PR_LABELS:-}"
release_note_type=""
for label in "${labels[@]:-}"; do
  if [[ $label == release_note:* ]]; then
    release_note_type=${label#"release_note:"}
  fi
done

if [ -z "$release_note_type" ]; then
  echo "Missing required release_note label, skipping"
  exit 0
fi

if [[ $release_note_type == skip ]]; then
  echo "release_note:skip opts out of changelog generation, skipping"
  exit 0
fi

export GH_TOKEN="$GITHUB_TOKEN"

# Grab the docs-builder binary
DOCS_BUILDER_VERSION="1.60.1"
DOCS_BUILDER_DIR="$(mktemp -d)"
trap 'rm -rf "$DOCS_BUILDER_DIR"' EXIT
DOCS_BUILDER="$DOCS_BUILDER_DIR/docs-builder"

echo "Downloading docs-builder v${DOCS_BUILDER_VERSION}..."
gh release download "$DOCS_BUILDER_VERSION" \
  --pattern 'docs-builder-linux-x64.zip' \
  --repo elastic/docs-builder \
  --dir "$DOCS_BUILDER_DIR"
gh attestation verify \
  "$DOCS_BUILDER_DIR/docs-builder-linux-x64.zip" \
  -R elastic/docs-builder
unzip -p "$DOCS_BUILDER_DIR/docs-builder-linux-x64.zip" docs-builder > "$DOCS_BUILDER"
chmod +x "$DOCS_BUILDER"

# Generate the changelog entry, then commit if the file was created or updated
"$DOCS_BUILDER" changelog add \
  --pr "$GITHUB_PR_NUMBER" \
  --owner elastic --repo kibana \
  --concise \
  --strict-fetch \
  --strip-title-prefix

check_for_changed_files \
  "docs-builder changelog add --prs ${GITHUB_PR_NUMBER}" \
  true \
  "Add changelog entry for PR #${GITHUB_PR_NUMBER}"
