/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression, ESQLFunction } from '@kbn/esql-ast';
import {
  getFunctionDefinition,
  getFormattedFunctionSignature,
} from '@kbn/esql-ast/src/definitions/utils';
import { getQueryForFields } from '../autocomplete/get_query_for_fields';
import { getColumnsByTypeRetriever } from '../autocomplete/autocomplete';
import type { ESQLCallbacks } from '../shared/types';
import { fromCache, setToCache } from './hover_cache';

export async function getFunctionSignatureHover(
  fnNode: ESQLFunction,
  fullText: string,
  root: ESQLAstQueryExpression,
  callbacks?: ESQLCallbacks
): Promise<Array<{ value: string }>> {
  // Use function name as cache key
  const cacheKey = fnNode.name;
  const cached = fromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const fnDefinition = getFunctionDefinition(fnNode.name);
  if (fnDefinition) {
    const { getColumnMap } = getColumnsByTypeRetriever(
      getQueryForFields(fullText, root),
      fullText,
      callbacks
    );
    const columnsMap = await getColumnMap();

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
