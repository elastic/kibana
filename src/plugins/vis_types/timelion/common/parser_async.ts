/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ParsedExpression } from './parser';

/** Build optimizations, we want to exclude the parser from the main bundle **/
export const parseTimelionExpressionAsync = async (input: string): Promise<ParsedExpression> => {
  const { parseTimelionExpression } = await import('./parser');
  return parseTimelionExpression(input);
};
