#!/usr/bin/env bash
set -euo pipefail

# Function to add @ts-nocheck to a file
add_ts_nocheck() {
  local file=$1
  if [ -f "$file" ]; then
    echo "Adding @ts-nocheck to $file"
    echo -e "// @ts-nocheck\n$(cat "$file")" > "$file"
  else
    echo "$file not found!"
  fi
}

# Add @ts-nocheck to the parser file
add_ts_nocheck src/antlr/esql_parser.ts

# Add @ts-nocheck to the lexer file
add_ts_nocheck src/antlr/esql_lexer.ts

# Rename the parser listener file if it exists
if [ -f src/antlr/esql_parserListener.ts ]; then
  echo "Renaming src/antlr/esql_parserListener.ts to src/antlr/esql_parser_listener.ts"
  mv src/antlr/esql_parserListener.ts src/antlr/esql_parser_listener.ts
else
  echo "src/antlr/esql_parserListener.ts not found!"
fi
