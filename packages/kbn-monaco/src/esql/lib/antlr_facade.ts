/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CommonTokenStream, CodePointCharStream } from 'antlr4ts';

import { esql_lexer as ESQLLexer } from '../antlr/esql_lexer';
import { esql_parser as ESQLParser } from '../antlr/esql_parser';
import type { esql_parserListener as ESQLParserListener } from '../antlr/esql_parser_listener';

import type { ANTLREErrorListener } from '../../common/error_listener';

export const ROOT_STATEMENT = 'singleStatement';

export const getParser = (
  inputStream: CodePointCharStream,
  errorListener: ANTLREErrorListener,
  parseListener?: ESQLParserListener
) => {
  const lexer = getLexer(inputStream, errorListener);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new ESQLParser(tokenStream);

  parser.removeErrorListeners();
  parser.addErrorListener(errorListener);

  if (parseListener) {
    parser.addParseListener(parseListener);
  }

  return parser;
};

export const getLexer = (inputStream: CodePointCharStream, errorListener: ANTLREErrorListener) => {
  const lexer = new ESQLLexer(inputStream);

  lexer.removeErrorListeners();
  lexer.addErrorListener(errorListener);

  return lexer;
};
