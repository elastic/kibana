/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Token } from 'antlr4';
import { default as ESQLLexer } from '../antlr/esql_lexer';
import { DEFAULT_CHANNEL } from './constants';

export const MAX_QUERY_NESTING_DEPTH = 50;
export const QUERY_NESTING_ERROR_CODE = 'queryTooComplex';

export class QueryNestingError extends Error {
  constructor() {
    super('ES|QL statement contains unsupported query nesting');
    this.name = 'QueryNestingError';
  }
}

export const assertQueryNesting = (tokens: readonly Token[]): void => {
  let nestingDepth = 0;

  for (const token of tokens) {
    if (token.channel !== DEFAULT_CHANNEL) {
      continue;
    }

    if (token.type === ESQLLexer.LP) {
      nestingDepth++;
    } else if (token.type === ESQLLexer.RP) {
      nestingDepth = Math.max(0, nestingDepth - 1);
    }

    if (nestingDepth > MAX_QUERY_NESTING_DEPTH) {
      throw new QueryNestingError();
    }
  }
};
