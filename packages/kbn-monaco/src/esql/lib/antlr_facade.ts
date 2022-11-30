/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CommonTokenStream, CodePointCharStream } from 'antlr4ts';

import { ANTLREErrorListener } from '../../common/worker/error_listener';

import { esql_lexer as ESQLLexer } from '../antlr/esql_lexer';
import { esql_parser as ESQLParser } from '../antlr/esql_parser';

export const getParser = (
  inputStream: CodePointCharStream,
  errorListener = new ANTLREErrorListener()
) => {
  const { lexer } = getLexer(inputStream, errorListener);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new ESQLParser(tokenStream);

  parser.removeErrorListeners();
  parser.addErrorListener(errorListener);

  return { parser, lexer, errorListener };
};

export const getLexer = (
  inputStream: CodePointCharStream,
  errorListener = new ANTLREErrorListener()
) => {
  const lexer = new ESQLLexer(inputStream);

  lexer.removeErrorListeners();
  lexer.addErrorListener(errorListener);

  return { lexer, errorListener };
};

export const getErrors = (inputStream: CodePointCharStream) => {
  const { errorListener } = getParser(inputStream);

  return errorListener.getErrors();
};
