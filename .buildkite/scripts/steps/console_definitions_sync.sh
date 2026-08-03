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
  node scripts/generate_console_definitions.js \
    --source "$PARENT_DIR/elasticsearch-specification" \
    --emptyDest \
    --skipOverrideAudit

  echo "--- Auditing curated override conflicts"
  local audit_output
  local audit_status
  set +e
  audit_output=$(node scripts/audit_console_definition_overrides.js 2>&1)
  audit_status=$?
  set -e
  echo "$audit_output"

  local auto_merge=true
  local pr_body='This PR updates the console definitions to match the latest ones from the @elastic/elasticsearch-specification repo.'
  if [ $audit_status -ne 0 ]; then
    echo "Override conflict audit requires human review; creating a PR without auto-merge."
    auto_merge=false
    pr_body+=$'\n\n## Override conflict audit\n\nThis specification update changes generated body rules that curated overrides replace. Review each conflict, fix stale overrides, and update the approved conflict baseline only when the remaining replacements are intentional.\n\n```\n'
    pr_body+="$audit_output"
    pr_body+=$'\n```'
  fi

  create_sync_pr \
    "$GIT_SCOPE" \
    "[Console] Update console definitions (${BUILDKITE_BRANCH})" \
    "$pr_body" \
    "console_definitions_sync" \
    "Update console definitions" \
    "console_defs_existing_pr" \
    "$auto_merge" \
    'backport:skip' 'release_note:skip' 'Feature:Console' 'Team:Kibana Management'

  return $audit_status
}

main
