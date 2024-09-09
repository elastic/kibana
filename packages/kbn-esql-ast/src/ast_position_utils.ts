/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Token } from 'antlr4';

export function getPosition(
  token: Pick<Token, 'start' | 'stop'> | null,
  lastToken?: Pick<Token, 'stop'> | undefined
) {
  if (!token || token.start < 0) {
    return { min: 0, max: 0 };
  }
  const endFirstToken = token.stop > -1 ? Math.max(token.stop + 1, token.start) : undefined;
  const endLastToken = lastToken?.stop;
  return {
    min: token.start,
    max: endLastToken ?? endFirstToken ?? Infinity,
  };
}
