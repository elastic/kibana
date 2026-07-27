#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/steps/console_definitions/sync_pr_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/console_definitions/sync_pr_lib.sh"

# Narrowed to json/ only so it doesn't overlap with the kibana_api_doc_links_sync step,
# whose output lives under kibana_api_doc_links/ in the same parent directory.
GIT_SCOPE="src/platform/plugins/shared/console/server/lib/spec_definitions/json"

main() {
  cd "$PARENT_DIR"

  echo "--- Cloning elasticsearch-specification"
  rm -rf elasticsearch-specification
  if ! git clone --branch "$BUILDKITE_BRANCH" https://github.com/elastic/elasticsearch-specification --depth 1; then
    echo "Error: Failed to clone the elasticsearch-specification repository."
    exit 1
  fi

  echo "--- Bootstrapping Kibana"
  cd "$KIBANA_DIR"
  .buildkite/scripts/bootstrap.sh

  echo "--- Generating console definitions"
  node scripts/generate_console_definitions.js --source "$PARENT_DIR/elasticsearch-specification" --emptyDest

  create_sync_pr \
    "$GIT_SCOPE" \
    "[Console] Update console definitions (${BUILDKITE_BRANCH})" \
    'This PR updates the console definitions to match the latest ones from the @elastic/elasticsearch-specification repo.' \
    "console_definitions_sync" \
    "Update console definitions" \
    "console_defs_existing_pr" \
    'backport:skip' 'release_note:skip' 'Feature:Console' 'Team:Kibana Management'
}

main
