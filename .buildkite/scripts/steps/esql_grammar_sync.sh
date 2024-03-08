#!/bin/bash

gh || exit

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
  echo "Differences found. Committing changes."

  # Make a commit
  git config --global user.name kibanamachine
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  git add "$destination_file"
  git commit -m "updating ES|QL lexer grammar"
  echo "Changes committed."

  # TODO - create PR
else
  echo "No differences found. Our work is done here."
fi
