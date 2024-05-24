#!/usr/bin/env bash
set -euo pipefail

report_main_step () {
  echo "--- $1"
}

main () {
  cd "$PARENT_DIR"

  report_main_step "Cloning Elasticsearch repository"

  rm -rf elasticsearch
  git clone https://github.com/elastic/elasticsearch --depth 1

  report_main_step "Bootstrapping Kibana"

  cd "$KIBANA_DIR"

  .buildkite/scripts/bootstrap.sh

  cd "$KIBANA_DIR/packages/kbn-esql-validation-autocomplete"

  report_main_step "Generate function definitions"

  yarn make:defs $PARENT_DIR/elasticsearch

  report_main_step "Generate function validation tests"
  
  yarn make:tests

  # Check for differences
  set +e
  git diff --exit-code --quiet .
  if [ $? -eq 0 ]; then
    echo "No differences found. Our work is done here."
    exit
  fi
  set -e

  report_main_step "Differences found. Checking for an existing pull request."

  KIBANA_MACHINE_USERNAME="kibanamachine"
  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  PR_TITLE='[ES|QL] Update function definitions'
  PR_BODY='This PR updates the function definitions based on the latest metadata from Elasticsearch.'

  # Check if a PR already exists
  pr_search_result=$(gh pr list --search "$PR_TITLE" --state open --author "$KIBANA_MACHINE_USERNAME"  --limit 1 --json title -q ".[].title")

  if [ "$pr_search_result" == "$PR_TITLE" ]; then
    echo "PR already exists. Exiting."
    exit
  fi

  echo "No existing PR found. Committing changes."

  # Make a commit
  BRANCH_NAME="esql_generate_function_definitions_$(date +%s)"

  git checkout -b "$BRANCH_NAME"

  git add ./**/*
  git commit -m "Update function definitions"

  report_main_step "Changes committed. Creating pull request."

  git push origin "$BRANCH_NAME"

  # Create a PR
  gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base main --head "${BRANCH_NAME}" --label 'release_note:skip' --label 'Team:ESQL' 
}

main
