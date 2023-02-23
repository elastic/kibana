/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CommonTokenStream, CharStreams } from 'antlr4ts';
import { painless_parser as PainlessParser, SourceContext } from '../../antlr/painless_parser';
import { PainlessLexerEnhanced } from './lexer';
import { EditorError } from '../../../types';
import { ANTLREErrorListener } from '../../../common/error_listener';

const parse = (
  code: string
): {
  source: SourceContext;
  errors: EditorError[];
} => {
  const inputStream = CharStreams.fromString(code);
  const lexer = new PainlessLexerEnhanced(inputStream);
  const painlessLangErrorListener = new ANTLREErrorListener();
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new PainlessParser(tokenStream);

  lexer.removeErrorListeners();
  parser.removeErrorListeners();

  lexer.addErrorListener(painlessLangErrorListener);
  parser.addErrorListener(painlessLangErrorListener);

  const errors: EditorError[] = painlessLangErrorListener.getErrors();

  return {
    source: parser.source(),
    errors,
  };
};

export const parseAndGetSyntaxErrors = (code: string): EditorError[] => {
  const { errors } = parse(code);
  return errors;
};
