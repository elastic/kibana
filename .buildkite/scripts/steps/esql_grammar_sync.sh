#!/bin/bash

cd kibana || exit

# Source and destination paths
source_file="../elasticsearch/x-pack/plugin/esql/src/main/antlr/EsqlBaseLexer.g4"
destination_file="./packages/kbn-monaco/src/esql/antlr/esql_lexer.g4"

# Copy the file
cp "$source_file" "$destination_file"

# Replace the line containing "lexer grammar" with "lexer grammar esql_lexer;"
sed -i '' -e 's/lexer grammar.*$/lexer grammar esql_lexer;/' "$destination_file"

# Insert "options { caseInsensitive = true; }" one line below
sed -i '' -e '/lexer grammar esql_lexer;/a\
options { caseInsensitive = true; }' "$destination_file"

echo "File copied and modified successfully. Checking for differences."

# Check for differences
git diff --exit-code --quiet "$destination_file"
if [ $? -ne 0 ]; then
  # Make a commit
  git add "$destination_file"
  git commit -m "updating ES|QL lexer grammar"
  echo "Changes committed."
else
  echo "No differences found. Our work is done here."
fi
