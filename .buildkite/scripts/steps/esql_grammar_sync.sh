#!/bin/bash

git config --global user.name kibanamachine
git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

cd "$PARENT_DIR" || exit

rm -rf elasticsearch
git clone https://github.com/elastic/elasticsearch --depth 1 || exit

rm -rf open-source
git clone https://github.com/elastic/open-source --depth 1 || exit

cd "$KIBANA_DIR" || exit

# Source and destination paths
license_header_file="$PARENT_DIR/open-source/legal/elastic-license-2.0-header.txt"
source_file="$PARENT_DIR/elasticsearch/x-pack/plugin/esql/src/main/antlr/EsqlBaseLexer.g4"
destination_file="./packages/kbn-monaco/src/esql/antlr/esql_lexer.g4"

# Copy the file
cp "$source_file" "$destination_file" || exit

# Insert the header information
license_header=$(cat "$license_header_file")
temp_file=$(mktemp)
printf "%s\n\n// DO NOT MODIFY THIS FILE BY HAND. IT IS MANAGED BY A CI JOB.\n\n%s" "${license_header}" "$(cat ${destination_file})" > "$temp_file"
mv "$temp_file" "${destination_file}"

# Replace the line containing "lexer grammar" with "lexer grammar esql_lexer;"
sed -i -e 's/lexer grammar.*$/lexer grammar esql_lexer;/' "$destination_file" || exit

# Insert "options { caseInsensitive = true; }" one line below
sed -i -e '/lexer grammar esql_lexer;/a\
options { caseInsensitive = true; }' "$destination_file" || exit

echo "File copied and modified successfully. Checking for differences."

# Check for differences
git -P diff
git diff --exit-code --quiet "$destination_file"

if [ $? -ne 0 ]; then
  echo "Differences found. Checking for existing PR..."
  PR_TITLE='[ES|QL] Update lexer grammar'
  PR_BODY='This PR updates the ES|QL lexer grammar to match the latest version in Elasticsearch.'
 
  # Check if a PR already exists
  pr_search_result=$(gh pr list --search "$PR_TITLE" --state open --author "kibanamachine"  --limit 1 --json title -q ".[].title")

  if [ "$pr_search_result" == "$PR_TITLE" ]; then
    echo "PR already exists. Exiting."
    exit
  fi

  echo "No existing PR found. Proceeding with the update."

  # Bootstrap Kibana
  yarn kbn bootstrap || exit

  # Built ANTLR stuff
  cd ./packages/kbn-monaco/src || exit 
  yarn build:antlr4:esql || exit

  # Make a commit
  BRANCH_NAME="esql_grammar_sync_$(date +%s)"

  git checkout -b "$BRANCH_NAME"

  git add -A
  git commit -m "updating ES|QL lexer grammar"

  git push --set-upstream origin "$BRANCH_NAME"

  echo "Changes committed. Creating pull request."

  # Create a PR
  gh pr create --draft --title "$PR_TITLE" --body "$PR_BODY" --base main --head "$BRANCH_NAME" --label 'release_note:skip' || exit

else
  echo "No differences found. Our work is done here."
fi
