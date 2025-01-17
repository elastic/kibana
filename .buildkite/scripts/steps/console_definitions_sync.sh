#!/usr/bin/env bash
set -euo pipefail

GIT_SCOPE="src/platform/plugins/shared/console/server/lib/spec_definitions"

# We will generate the console definitions for both main and 8.x branches
BRANCHES=("main" "8.x")
# Github username for the Kibana machine user
KIBANA_MACHINE_USERNAME="kibanamachine"

report_main_step () {
  echo "--- $1"
}

update_console_definitions() {
  local branch="$1"

  report_main_step "=== [Branch: $branch] ==="
  report_main_step "Checking out Elasticsearch Specification on branch: $branch"

  cd "$PARENT_DIR"

  # Remove old copy if it exists
  rm -rf elasticsearch-specification

  # Clone the ES spec on the given branch
  if ! git clone --branch "$branch" https://github.com/elastic/elasticsearch-specification --depth 1; then
    echo "Error: Failed to clone the elasticsearch-specification repository (branch: $branch)."
    exit 1
  fi

  # Now switch Kibana to the same branch
  report_main_step "Switching Kibana to branch: $branch"
  cd "$KIBANA_DIR"
  git checkout "$branch"

  report_main_step "Bootstrapping Kibana (branch: $branch)"
  .buildkite/scripts/bootstrap.sh

  report_main_step "Generating console definitions (branch: $branch)"
  node scripts/generate_console_definitions.js \
    --source "$PARENT_DIR/elasticsearch-specification" \
    --emptyDest

  # Check if there are any differences
  set +e
  git diff --exit-code --quiet "$GIT_SCOPE"
  local diff_exit_code=$?
  set -e

  if [ $diff_exit_code -eq 0 ]; then
    echo "No differences found on branch '$branch'. Moving on."
    return 0
  fi

  report_main_step "Differences found on branch '$branch'. Checking for an existing pull request."

  # Prepare PR title/body
  local PR_TITLE="[Console] Update console definitions ($branch)"
  local PR_BODY="This PR updates the console definitions to match the latest from the @elastic/elasticsearch-specification repo on the '$branch' branch."

  # Check if a PR already exists (search by title, state, and author)
  local pr_search_result
  pr_search_result=$(gh pr list \
    --search "$PR_TITLE" \
    --state open \
    --author "$KIBANA_MACHINE_USERNAME" \
    --limit 1 \
    --json title \
    -q ".[].title" || true)

  if [ "$pr_search_result" == "$PR_TITLE" ]; then
    echo "PR already exists on branch '$branch'. Skipping creation."
    return 0
  fi

  echo "No existing PR found for branch '$branch'. Proceeding."

  # Commit the changes on a new branch
  local TEMP_BRANCH_NAME="console_definitions_sync_${branch}_$(date +%s)"
  git checkout -b "$TEMP_BRANCH_NAME"

  git add "$GIT_SCOPE"
  git commit -m "Update console definitions"

  report_main_step "Changes committed. Pushing branch '$TEMP_BRANCH_NAME' and creating pull request."

  git push origin "$TEMP_BRANCH_NAME"

  # Create the PR, targeting the same branch in Kibana
  gh pr create \
    --title "$PR_TITLE" \
    --body "$PR_BODY" \
    --base "$branch" \
    --head "${TEMP_BRANCH_NAME}" \
    --label 'release_note:skip' \
    --label 'backport:skip' \
    --label 'Feature:Console' \
    --label 'Team:Kibana Management'
}

main() {
  # Configure git user
  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  # Run the process for each branch in sequence
  for br in "${BRANCHES[@]}"; do
    update_console_definitions "$br"
  done
}

main
