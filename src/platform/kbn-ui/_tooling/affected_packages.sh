#!/usr/bin/env bash

# Lists kbn-ui packages affected by changes in a given git revision range.
#
# Usage:
#   affected_packages.sh <base-ref> [head-ref]
#
# Defaults head-ref to HEAD. Prints one package directory name per line
# (e.g. `side-navigation`).
#
# Behavior:
#   - Scopes the diff to src/platform/kbn-ui/.
#   - If anything under src/platform/kbn-ui/_tooling/ changed, prints ALL
#     package directories (shared tooling is a universal rebuild trigger).
#   - Exits 0 with empty output when nothing under kbn-ui/ changed.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: affected_packages.sh <base-ref> [head-ref]" >&2
  exit 2
fi

BASE_REF="$1"
HEAD_REF="${2:-HEAD}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KBN_UI_ROOT="$(dirname "$SCRIPT_DIR")"

# All current package directories under kbn-ui (excluding _tooling and anything
# that starts with _; those are not distributable packages).
all_packages() {
  find "$KBN_UI_ROOT" -mindepth 1 -maxdepth 1 -type d \
    ! -name '_*' \
    -exec basename {} \; | sort
}

# Paths changed under src/platform/kbn-ui/ in the given range.
changed_paths="$(
  git diff --name-only "$BASE_REF" "$HEAD_REF" -- src/platform/kbn-ui/ || true
)"

if [ -z "$changed_paths" ]; then
  exit 0
fi

# If shared tooling changed, every package is affected.
if echo "$changed_paths" | grep -q '^src/platform/kbn-ui/_tooling/'; then
  all_packages
  exit 0
fi

# Otherwise, the 4th segment of each changed path is the package dir.
# Filter out '_*' entries defensively (shouldn't match, but be explicit).
echo "$changed_paths" \
  | awk -F/ 'NF >= 4 && $4 !~ /^_/ {print $4}' \
  | sort -u
