#!/usr/bin/env bash
set -euo pipefail

# Get the grammar type from the first argument (esql or promql)
GRAMMAR_TYPE="${1:-esql}"

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

if [ "$GRAMMAR_TYPE" == "esql" ]; then
  # Add @ts-nocheck to the parser file
  add_ts_nocheck src/parser/antlr/esql_parser.ts

  # Add @ts-nocheck to the lexer file
  add_ts_nocheck src/parser/antlr/esql_lexer.ts

  # Rename the parser listener file if it exists
  if [ -f src/parser/antlr/esql_parserListener.ts ]; then
    echo "Renaming src/parser/antlr/esql_parserListener.ts to src/parser/antlr/esql_parser_listener.ts"
    mv src/parser/antlr/esql_parserListener.ts src/parser/antlr/esql_parser_listener.ts
  else
    echo "src/parser/antlr/esql_parserListener.ts not found!"
  fi
elif [ "$GRAMMAR_TYPE" == "promql" ]; then
  # Add @ts-nocheck to the parser file
  add_ts_nocheck src/parser/antlr/promql_parser.ts

  # Add @ts-nocheck to the lexer file
  add_ts_nocheck src/parser/antlr/promql_lexer.ts

  # Rename the parser listener file if it exists
  if [ -f src/parser/antlr/promql_parserListener.ts ]; then
    echo "Renaming src/parser/antlr/promql_parserListener.ts to src/parser/antlr/promql_parser_listener.ts"
    mv src/parser/antlr/promql_parserListener.ts src/parser/antlr/promql_parser_listener.ts
  else
    echo "src/parser/antlr/promql_parserListener.ts not found!"
  fi
else
  echo "Unknown grammar type: $GRAMMAR_TYPE"
  echo "Usage: $0 [esql|promql]"
  exit 1
fi
