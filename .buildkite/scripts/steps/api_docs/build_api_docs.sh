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

# Parse the JSON array and build docs for each changed plugin/package
PLUGIN_COUNT=$(echo "$CHANGED_PLUGINS" | jq 'length')
echo "Changed plugins/packages: $CHANGED_PLUGINS"
echo "--- Build API Docs for $PLUGIN_COUNT plugin(s)/package(s)"

# Extract plugin IDs from JSON array and build docs for each
echo "$CHANGED_PLUGINS" | jq -r '.[]' | while read -r PLUGIN_ID; do
  if [ -n "$PLUGIN_ID" ]; then
    echo "Building API docs for: $PLUGIN_ID"
    node --max-old-space-size=24000 scripts/build_api_docs --plugin "$PLUGIN_ID"
  fi
done

if [[ "${PUBLISH_API_DOCS_CHANGES:-}" == "true" ]]; then
  echo "--- Store API Docs changes in Buildkite"
  git add -N ./*.docnav.json
  git add -N api_docs
  git diff > api_docs_changes.diff
  buildkite-agent artifact upload api_docs_changes.diff

  echo "API Docs changes uploaded"
fi
