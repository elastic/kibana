#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Detecting changed plugins/packages"
# Run the script and capture only the JSON output (last line)
CHANGED_PLUGINS=$(node scripts/get_changed_plugins.js | tail -n 1)

if [ -z "$CHANGED_PLUGINS" ] || [ "$CHANGED_PLUGINS" == "[]" ]; then
  echo "No changed plugins/packages detected, skipping API docs build"
  exit 0
fi

# Restore TypeScript build cache
echo "--- Restore TypeScript build cache"
node scripts/type_check --restore-only

# Parse the JSON array and build docs for all changed plugins in one go
PLUGIN_COUNT=$(echo "$CHANGED_PLUGINS" | jq 'length')
echo "Changed plugins/packages: $CHANGED_PLUGINS"
echo "--- Build API Docs for $PLUGIN_COUNT plugin(s)/package(s)"

# Build plugin flags array - pass all plugins to a single invocation
PLUGIN_FLAGS=""
while IFS= read -r PLUGIN_ID; do
  if [ -n "$PLUGIN_ID" ]; then
    PLUGIN_FLAGS="$PLUGIN_FLAGS --plugin $PLUGIN_ID"
  fi
done < <(echo "$CHANGED_PLUGINS" | jq -r '.[]')

# Single invocation with all plugins - much faster than multiple calls
echo "Building API docs with flags:$PLUGIN_FLAGS"
node --max-old-space-size=24000 scripts/build_api_docs $PLUGIN_FLAGS

if [[ "${PUBLISH_API_DOCS_CHANGES:-}" == "true" ]]; then
  echo "--- Store API Docs changes in Buildkite"
  git add -N ./*.docnav.json
  git add -N api_docs
  git diff > api_docs_changes.diff
  buildkite-agent artifact upload api_docs_changes.diff

  echo "API Docs changes uploaded"
fi
