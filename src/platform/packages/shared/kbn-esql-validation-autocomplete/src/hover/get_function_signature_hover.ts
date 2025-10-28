/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker, type ESQLFunction } from '@kbn/esql-ast';
import {
  getFunctionDefinition,
  getFormattedFunctionSignature,
} from '@kbn/esql-ast/src/definitions/utils';
import { fromCache, setToCache } from './hover_cache';
import type { ColumnsMap, GetColumnMapFn } from '../shared/columns';

export async function getFunctionSignatureHover(
  fnNode: ESQLFunction,
  getColumnMap: GetColumnMapFn
): Promise<Array<{ value: string }>> {
  // Getting the columns map is not expensive, it's already cached.
  const columnsMap = await getColumnMap();

  // Use function name and argument types as cache key, fnName:argType1,argType2
  const cacheKey = getFunctionCachekey(fnNode, columnsMap);
  const cached = fromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const fnDefinition = getFunctionDefinition(fnNode.name);
  if (fnDefinition) {
    const formattedSignature = getFormattedFunctionSignature(fnDefinition, fnNode, columnsMap);

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

/**
 * Returns a cache key for the function signature hover based on function name and argument types.
 * fnName:argType1,argType2
 *
 * @param fnNode
 * @param columnsMap
 * @returns
 */
const getFunctionCachekey = (fnNode: ESQLFunction, columnsMap: ColumnsMap) => {
  const argTypes: string[] = [];
  Walker.walk(fnNode, {
    visitColumn: (columnNode) => {
      const columnType = columnsMap.get(columnNode.name)?.type || 'unknown';
      argTypes.push(columnType);
    },
  });

  return `${fnNode.name}:${argTypes.join(',')}`;
};
