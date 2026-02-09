/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLFunction } from '../../types';
import {
  getFunctionDefinition,
  getFormattedFunctionSignature,
} from '../../commands/definitions/utils';
import { fromCache, setToCache } from './hover_cache';

export async function getFunctionSignatureHover(
  fnNode: ESQLFunction
): Promise<Array<{ value: string }>> {
  // Use function name and argument types as cache key, fnName:argType1,argType2
  const cacheKey = fnNode.name;
  const cached = fromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const fnDefinition = getFunctionDefinition(fnNode.name);
  if (fnDefinition) {
    const formattedSignature = getFormattedFunctionSignature(fnDefinition, fnNode);

    const result = [
      {
        value: `\`\`\`none
${formattedSignature}
\`\`\``,
      },
      { value: fnDefinition.description },
    ];

    setToCache(cacheKey, result);
    return result;
  } else {
    setToCache(cacheKey, []);
    return [];
  }
}
