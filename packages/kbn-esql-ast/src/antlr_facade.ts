/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CommonTokenStream, type CharStream, type ErrorListener } from 'antlr4';

import { default as ESQLLexer } from './antlr/esql_lexer';
import { default as ESQLParser } from './antlr/esql_parser';
import { default as ESQLParserListener } from './antlr/esql_parser_listener';

export const ROOT_STATEMENT = 'singleStatement';

export const getParser = (
  inputStream: CharStream,
  errorListener: ErrorListener<any>,
  parseListener?: ESQLParserListener
) => {
  const lexer = getLexer(inputStream, errorListener);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new ESQLParser(tokenStream);

  parser.removeErrorListeners();
  parser.addErrorListener(errorListener);

  if (parseListener) {
    // @ts-expect-error the addParseListener API does exist and is documented here
    // https://github.com/antlr/antlr4/blob/dev/doc/listeners.md
    parser.addParseListener(parseListener);
  }

  return parser;
};

export const getLexer = (inputStream: CharStream, errorListener: ErrorListener<any>) => {
  const lexer = new ESQLLexer(inputStream);

  lexer.removeErrorListeners();
  lexer.addErrorListener(errorListener);

  return lexer;
};
