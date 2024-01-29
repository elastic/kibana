/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RecognitionException } from 'antlr4ts';
import { esql_parser } from '../../antlr/esql_parser';
import { getPosition } from './ast_position_utils';

function getExpectedSymbols(expectedTokens: RecognitionException['expectedTokens']) {
  const tokenIds = expectedTokens?.toIntegerList().toArray() || [];
  const list = [];
  for (const tokenId of tokenIds) {
    if (esql_parser.VOCABULARY.getSymbolicName(tokenId)) {
      const symbol = esql_parser.VOCABULARY.getSymbolicName(tokenId);
      list.push(symbol === 'EOF' ? `<${symbol}>` : symbol);
    }
  }
  return list;
}

export function createError(exception: RecognitionException) {
  const token = exception.getOffendingToken();
  if (token) {
    const expectedSymbols = getExpectedSymbols(exception.expectedTokens);
    if (
      ['ASTERISK', 'UNQUOTED_IDENTIFIER', 'QUOTED_IDENTIFIER'].every(
        (s, i) => expectedSymbols[i] === s
      )
    ) {
      return {
        type: 'error' as const,
        text: `Unknown column ${token.text}`,
        location: getPosition(token),
      };
    }
  }
  return {
    type: 'error' as const,
    text: token
      ? `SyntaxError: expected {${getExpectedSymbols(exception.expectedTokens).join(
          ', '
        )}} but found "${token.text}"`
      : exception.message,
    location: getPosition(token),
  };
}
