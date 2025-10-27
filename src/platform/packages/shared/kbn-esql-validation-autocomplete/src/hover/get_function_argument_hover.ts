/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import {
  TIME_SYSTEM_PARAMS,
  type ESQLAstItem,
  type ESQLAstQueryExpression,
  type ESQLFunction,
  within,
} from '@kbn/esql-ast';
import { getFunctionDefinition } from '@kbn/esql-ast/src/definitions/utils';
import { isESQLNamedParamLiteral } from '@kbn/esql-ast/src/types';
import type { ESQLCallbacks } from '../shared/types';
import { fromCache, setToCache } from './hover_cache';

const TIME_SYSTEM_DESCRIPTIONS = {
  '?_tstart': i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.timeSystemParamStart',
    {
      defaultMessage: 'The start time from the date picker',
    }
  ),
  '?_tend': i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.timeSystemParamEnd',
    {
      defaultMessage: 'The end time from the date picker',
    }
  ),
};

// Find the argument that contains the cursor offset
const findArgumentAtOffset = (args: ESQLAstItem[], targetOffset: number): ESQLAstItem | null => {
  for (const arg of args) {
    if (Array.isArray(arg)) {
      const found = findArgumentAtOffset(arg, targetOffset);
      if (found) return found;
    } else if ('location' in arg && arg.location && within(targetOffset, arg)) {
      return arg;
    }
  }
  return null;
};

export async function getFunctionArgumentHover(
  fnNode: ESQLFunction,
  root: ESQLAstQueryExpression,
  query: string,
  offset: number,
  resourceRetriever?: ESQLCallbacks
): Promise<Array<{ value: string }>> {
  const fnDefinition = getFunctionDefinition(fnNode.name);
  if (!fnDefinition) {
    return [];
  }

  const argumentAtOffset = findArgumentAtOffset(fnNode.args || [], offset);
  if (!argumentAtOffset) {
    return [];
  }

  const argIdentifier = 'name' in argumentAtOffset ? argumentAtOffset.name : 'unknown';
  // Use function name + argument identifier as cache key
  const cacheKey = `${fnNode.name}:${argIdentifier}`;
  const cached = fromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const contents: { value: string }[] = [];
  if (argumentAtOffset && isESQLNamedParamLiteral(argumentAtOffset)) {
    const bestMatch = TIME_SYSTEM_PARAMS.find((p) => p.startsWith(argumentAtOffset.text));
    // We only know if it's start or end after first 3 characters (?t_s or ?t_e)
    if (argumentAtOffset.text.length > 3 && bestMatch) {
      Object.entries(TIME_SYSTEM_DESCRIPTIONS).forEach(([key, value]) => {
        contents.push({
          value: `**${key}**: ${value}`,
        });
      });
    }
  }

  setToCache(cacheKey, contents);
  return contents;
}
