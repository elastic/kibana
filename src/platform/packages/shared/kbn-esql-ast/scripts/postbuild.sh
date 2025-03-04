#!/bin/bash

# Check if the parser file exists and add @ts-nocheck
if [ -f src/antlr/esql_parser.ts ]; then
  sed -i '' -e '1s/^/\/\/ @ts-nocheck\n/' src/antlr/esql_parser.ts
else
  echo "src/antlr/esql_parser.ts not found!"
fi

# Check if the lexer file exists and add @ts-nocheck
if [ -f src/antlr/esql_lexer.ts ]; then
  sed -i '' -e '1s/^/\/\/ @ts-nocheck\n/' src/antlr/esql_lexer.ts
else
  echo "src/antlr/esql_lexer.ts not found!"
fi

# Rename the parser listener file if it exists
if [ -f src/antlr/esql_parserListener.ts ]; then
  mv src/antlr/esql_parserListener.ts src/antlr/esql_parser_listener.ts
else
  echo "src/antlr/esql_parserListener.ts not found!"
fi