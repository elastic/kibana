/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Token } from 'antlr4ts';

export function getPosition(
  token: Pick<Token, 'startIndex' | 'stopIndex'> | undefined,
  lastToken?: Pick<Token, 'stopIndex'> | undefined
) {
  if (!token || token.startIndex < 0) {
    return { min: 0, max: 0 };
  }
  const endFirstToken =
    token.stopIndex > -1 ? Math.max(token.stopIndex + 1, token.startIndex) : undefined;
  const endLastToken = lastToken?.stopIndex;
  return {
    min: token.startIndex,
    max: endLastToken ?? endFirstToken ?? Infinity,
  };
}
