/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CommonTokenStream, CharStreams } from 'antlr4ts';
import { esql_parser as ESQLParser, QueryContext } from '../antlr/esql_parser';

import { SyntaxError, ESQLErrorListener } from './error_listener';
import { esql_lexer as ESQLLexer } from '../antlr/esql_lexer';

const parse = (
  code: string
): {
  source: QueryContext;
  errors: SyntaxError[];
} => {
  const inputStream = CharStreams.fromString(code);
  const lexer = new ESQLLexer(inputStream);
  const esqlLangErrorListener = new ESQLErrorListener();
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new ESQLParser(tokenStream);

  lexer.removeErrorListeners();
  lexer.addErrorListener(esqlLangErrorListener);

  parser.removeErrorListeners();
  parser.addErrorListener(esqlLangErrorListener);

  const errors: SyntaxError[] = esqlLangErrorListener.getErrors();

  return {
    source: parser.query(),
    errors,
  };
};

export const parseAndGetSyntaxErrors = (code: string): SyntaxError[] => {
  const { errors } = parse(code);
  return errors;
};
