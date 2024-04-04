#!/usr/bin/env bash
set -euo pipefail

synchronize_lexer_grammar () {
  license_header="$1"
  source_file="$PARENT_DIR/elasticsearch/x-pack/plugin/esql/src/main/antlr/EsqlBaseLexer.g4"
  destination_file="./packages/kbn-esql-ast/src/antlr/esql_lexer.g4"

  # Copy the file
  cp "$source_file" "$destination_file"

  # Insert the license header
  temp_file=$(mktemp)
  printf "%s\n\n// DO NOT MODIFY THIS FILE BY HAND. IT IS MANAGED BY A CI JOB.\n\n%s" "$license_header" "$(cat $destination_file)" > "$temp_file"
  mv "$temp_file" "$destination_file"

  # Replace the line containing "lexer grammar" with "lexer grammar esql_lexer;"
  sed -i -e 's/lexer grammar.*$/lexer grammar esql_lexer;/' "$destination_file"

  # Insert "options { caseInsensitive = true; }" one line below
  sed -i -e '/lexer grammar esql_lexer;/a\
  options { caseInsensitive = true; }' "$destination_file"

  echo "File copied and modified successfully."
}

synchronize_parser_grammar () {
  license_header="$1"
  source_file="$PARENT_DIR/elasticsearch/x-pack/plugin/esql/src/main/antlr/EsqlBaseParser.g4"
  destination_file="./packages/kbn-esql-ast/src/antlr/esql_parser.g4"

  # Copy the file
  cp "$source_file" "$destination_file"

  # Insert the license header
  temp_file=$(mktemp)
  printf "%s\n\n// DO NOT MODIFY THIS FILE BY HAND. IT IS MANAGED BY A CI JOB.\n\n%s" "$license_header" "$(cat ${destination_file})" > "$temp_file"
  mv "$temp_file" "$destination_file"

  # Replace the line containing "parser grammar" with "parser grammar esql_parser;"
  sed -i -e 's/parser grammar.*$/parser grammar esql_parser;/' "$destination_file"

  # Replace options {tokenVocab=EsqlBaseLexer;} with options {tokenVocab=esql_lexer;}
  sed -i -e 's/options {tokenVocab=EsqlBaseLexer;}/options {tokenVocab=esql_lexer;}/' "$destination_file"

  echo "File copied and modified successfully."
}

report_main_step () {
  echo "--- $1"
}

main () {
  cd "$PARENT_DIR"

  report_main_step "Cloning repositories"

  rm -rf elasticsearch
  git clone https://github.com/elastic/elasticsearch --depth 1

  rm -rf open-source
  git clone https://github.com/elastic/open-source --depth 1

  cd "$KIBANA_DIR"

  license_header=$(cat "$PARENT_DIR/open-source/legal/elastic-license-2.0-header.txt")

  report_main_step "Synchronizing lexer grammar..."
  synchronize_lexer_grammar "$license_header"

  report_main_step "Synchronizing parser grammar..."
  synchronize_parser_grammar "$license_header"

  # Check for differences
  set +e
  git diff --exit-code --quiet "$destination_file"
  if [ $? -eq 0 ]; then
    echo "No differences found. Our work is done here."
    exit
  fi
  set -e

  report_main_step "Differences found. Checking for an existing pull request."

  KIBANA_MACHINE_USERNAME="kibanamachine"
  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  PR_TITLE='[ES|QL] Update grammars'
  PR_BODY='This PR updates the ES|QL grammars (lexer and parser) to match the latest version in Elasticsearch.'

  # Check if a PR already exists
  pr_search_result=$(gh pr list --search "$PR_TITLE" --state open --author "$KIBANA_MACHINE_USERNAME"  --limit 1 --json title -q ".[].title")

  if [ "$pr_search_result" == "$PR_TITLE" ]; then
    echo "PR already exists. Exiting."
    exit
  fi

  echo "No existing PR found. Proceeding."

  report_main_step "Building ANTLR artifacts."

  # Bootstrap Kibana
  .buildkite/scripts/bootstrap.sh

  # Build ANTLR stuff
  cd ./packages/kbn-esql-ast/src
  yarn build:antlr4:esql

  # Make a commit
  BRANCH_NAME="esql_grammar_sync_$(date +%s)"

  git checkout -b "$BRANCH_NAME"

  git add antlr/*
  git commit -m "Update ES|QL grammars"

  report_main_step "Changes committed. Creating pull request."

  git push origin "$BRANCH_NAME"

  # Create a PR
  gh pr create --draft --title "$PR_TITLE" --body "$PR_BODY" --base main --head "${BRANCH_NAME}" --label 'release_note:skip' --label 'Team:ESQL' 
}

main
