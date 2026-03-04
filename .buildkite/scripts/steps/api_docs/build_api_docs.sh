#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Build API Docs"
# API_DOCS_BUILD_MODE: "affected" (default) runs only changed targets, "full" runs all
script_args=()
if [[ "${API_DOCS_BUILD_MODE:-affected}" == "full" ]]; then
  script_args+=(--full)
fi
node --max-old-space-size=24000 scripts/build_api_docs "${script_args[@]}"

if [[ "${PUBLISH_API_DOCS_CHANGES:-}" == "true" ]]; then
  echo "--- Store API Docs changes in Buildkite"
  git add -N ./*.docnav.json
  git add -N api_docs
  git diff > api_docs_changes.diff
  buildkite-agent artifact upload api_docs_changes.diff

  echo "API Docs changes uploaded"
fi
