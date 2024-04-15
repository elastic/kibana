/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams } from 'antlr4';
import { ESQLErrorListener } from './antlr_error_listener';
import { getParser, ROOT_STATEMENT } from './antlr_facade';
import { AstListener } from './ast_factory';
import type { ESQLAst, EditorError } from './types';

export async function getAstAndSyntaxErrors(text: string | undefined): Promise<{
  errors: EditorError[];
  ast: ESQLAst;
}> {
  if (text == null) {
    return { ast: [], errors: [] };
  }
  const errorListener = new ESQLErrorListener();
  const parseListener = new AstListener();
  const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

  parser[ROOT_STATEMENT]();

  return { ...parseListener.getAst(), errors: errorListener.getErrors() };
}
