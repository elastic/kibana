/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RecognitionException } from 'antlr4';
import { getPosition } from './ast_position_utils';

export function createError(exception: RecognitionException) {
  const token = exception.offendingToken;

  return {
    type: 'error' as const,
    text: `SyntaxError: ${exception.message}`,
    location: getPosition(token),
  };
}
