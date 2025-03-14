#!/usr/bin/env bash
set -euo pipefail

GIT_SCOPE="src/platform/plugins/shared/console/server/lib/spec_definitions"

report_main_step () {
  echo "--- $1"
}

main () {
  cd "$PARENT_DIR"

  report_main_step "Cloning repositories"

  rm -rf elasticsearch-specification
  if ! git clone --branch "$BUILDKITE_BRANCH" https://github.com/elastic/elasticsearch-specification --depth 1; then
    echo "Error: Failed to clone the elasticsearch-specification repository."
    exit 1
  fi

  report_main_step "Bootstrapping Kibana"
  cd "$KIBANA_DIR"
  .buildkite/scripts/bootstrap.sh

  report_main_step "Generating console definitions"
  node scripts/generate_console_definitions.js --source "$PARENT_DIR/elasticsearch-specification" --emptyDest

  # Check if there are any differences
  set +e
  git diff --exit-code --quiet "$GIT_SCOPE"
  if [ $? -eq 0 ]; then
    echo "No differences found. Exiting.."
    exit
  fi
  set -e

  report_main_step "Differences found. Checking for an existing pull request."

  KIBANA_MACHINE_USERNAME="kibanamachine"
  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  PR_TITLE="[Console] Update console definitions (${BUILDKITE_BRANCH})"
  PR_BODY='This PR updates the console definitions to match the latest ones from the @elastic/elasticsearch-specification repo.'

  # Check if a PR already exists
  pr_search_result=$(gh pr list --search "$PR_TITLE" --state open --author "$KIBANA_MACHINE_USERNAME"  --limit 1 --json title -q ".[].title")

  if [ "$pr_search_result" == "$PR_TITLE" ]; then
    echo "PR already exists. Exiting.."
    exit
  fi

  echo "No existing PR found. Proceeding.."

  # Commit diff
  BRANCH_NAME="console_definitions_sync_$(date +%s)"

  git checkout -b "$BRANCH_NAME"

  git add $GIT_SCOPE
  git commit -m "Update console definitions"

  report_main_step "Changes committed. Creating pull request."

  git push origin "$BRANCH_NAME"

  # Create PR
  gh pr create \
    --title "$PR_TITLE" \
    --body "$PR_BODY" \
    --base "$BUILDKITE_BRANCH" \
    --head "$BRANCH_NAME" \
    --label 'backport:skip' \
    --label 'release_note:skip' \
    --label 'Feature:Console' \
    --label 'Team:Kibana Management'
}

main
