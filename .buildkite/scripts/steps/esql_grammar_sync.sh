#!/bin/bash

cd "$PARENT_DIR" || exit

rm -rf elasticsearch
git clone https://github.com/elastic/elasticsearch --depth 1 || exit

cd "$KIBANA_DIR" || exit

# Source and destination paths
source_file="$PARENT_DIR/elasticsearch/x-pack/plugin/esql/src/main/antlr/EsqlBaseLexer.g4"
destination_file="./packages/kbn-monaco/src/esql/antlr/esql_lexer.g4"

# Copy the file
cp "$source_file" "$destination_file"

# Replace the line containing "lexer grammar" with "lexer grammar esql_lexer;"
sed -i -e 's/lexer grammar.*$/lexer grammar esql_lexer;/' "$destination_file" || exit

# Insert "options { caseInsensitive = true; }" one line below
sed -i -e '/lexer grammar esql_lexer;/a\
options { caseInsensitive = true; }' "$destination_file" || exit

echo "File copied and modified successfully. Checking for differences."

# Check for differences
git diff --exit-code --quiet "$destination_file"
if [ $? -ne 0 ]; then
  echo "Differences found. Building ANTLR stuff."

  # Bootstrap Kibana
  yarn kbn bootstrap || exit

  # Built ANTLR stuff
  cd ./packages/kbn-monaco/src || exit 
  yarn build:antlr4:esql || exit

  # Make a commit
  BRANCH_NAME="esql_grammar_sync_$(date +%s)"

  git config --global user.name kibanamachine
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  git checkout -b "$BRANCH_NAME"

  git add -A
  git commit -m "updating ES|QL lexer grammar"

  git push --set-upstream origin "$BRANCH_NAME"

  echo "Changes committed. Creating pull request."

  # Create a PR
  gh pr create -d --title "[ES|QL] Update lexer grammar" --body "This PR updates the ES|QL lexer grammar to match the latest version in Elasticsearch." \ 
  --base main --head "$BRANCH_NAME" --label "release_note:skip" || exit

else
  echo "No differences found. Our work is done here."
fi
