#!/usr/bin/env bash
# Runs yarn kbn bootstrap and verifies that @kbn/* workspaces were linked.
# Used by both the prebuild warmup and cold devcontainer starts.

set -euo pipefail

KIBANA_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KIBANA_ROOT"

echo "=== Bootstrapping ==="
yarn kbn bootstrap

echo "=== Verifying bootstrap linked workspaces ==="
if ! node -e "require.resolve('@kbn/setup-node-env')" 2>/dev/null; then
  echo "ERROR: bootstrap did not link workspaces (@kbn/setup-node-env unresolved)"
  exit 1
fi
echo "Workspaces linked"
