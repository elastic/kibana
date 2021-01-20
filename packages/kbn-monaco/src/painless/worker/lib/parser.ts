/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CommonTokenStream, CharStreams } from 'antlr4ts';
import { painless_parser as PainlessParser, SourceContext } from '../../antlr/painless_parser';
import { PainlessError, PainlessErrorListener } from './error_listener';
import { PainlessLexerEnhanced } from './lexer';

const parse = (
  code: string
): {
  source: SourceContext;
  errors: PainlessError[];
} => {
  const inputStream = CharStreams.fromString(code);
  const lexer = new PainlessLexerEnhanced(inputStream);
  const painlessLangErrorListener = new PainlessErrorListener();
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new PainlessParser(tokenStream);

  lexer.removeErrorListeners();
  parser.removeErrorListeners();

  lexer.addErrorListener(painlessLangErrorListener);
  parser.addErrorListener(painlessLangErrorListener);

  const errors: PainlessError[] = painlessLangErrorListener.getErrors();

  return {
    source: parser.source(),
    errors,
  };
};

export const parseAndGetSyntaxErrors = (code: string): PainlessError[] => {
  const { errors } = parse(code);
  return errors;
};
