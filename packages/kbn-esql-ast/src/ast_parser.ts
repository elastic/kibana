/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CharStreams } from 'antlr4';
import { ESQLErrorListener } from './antlr_error_listener';
import { getParser, ROOT_STATEMENT } from './antlr_facade';
import { AstListener } from './ast_factory';
import type { ESQLAst, EditorError } from './types';

// These will need to be manually updated whenever the relevant grammar changes.
const SYNTAX_ERRORS_TO_IGNORE = [
  `SyntaxError: mismatched input '<EOF>' expecting {'explain', 'from', 'meta', 'row', 'show'}`,
];

export function getAstAndSyntaxErrors(text: string | undefined): {
  errors: EditorError[];
  ast: ESQLAst;
} {
  if (text == null) {
    return { ast: [], errors: [] };
  }
  const errorListener = new ESQLErrorListener();
  const parseListener = new AstListener();
  const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

  parser[ROOT_STATEMENT]();

  const errors = errorListener.getErrors().filter((error) => {
    return !SYNTAX_ERRORS_TO_IGNORE.includes(error.message);
  });

  return { ...parseListener.getAst(), errors };
}
