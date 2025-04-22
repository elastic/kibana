/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type ESQLAst, parse } from '@kbn/esql-ast';
import type { ESQLCallbacks } from './types';
import type { ESQLRealField } from '../validation/types';
import { getFieldsFromES, getCurrentQueryAvailableFields } from './helpers';
import {
  removeLastPipe,
  processPipes,
  toSingleLine,
  getFirstPipeValue,
} from './query_string_utils';

export const NOT_SUGGESTED_TYPES = ['unsupported'];

export function buildQueryUntilPreviousCommand(ast: ESQLAst, queryString: string) {
  const prevCommand = ast[Math.max(ast.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

const cache = new Map<string, ESQLRealField[]>();

async function setFieldsToCache(queryText: string) {
  const existsInCache = cache.has(queryText);
  if (existsInCache) {
    // this is already in the cache
    return;
  }
  const queryTextWithoutLastPipe = removeLastPipe(queryText);
  // retrieve the user defined fields from the query without an extra call
  const previousPipeFields = cache.get(queryTextWithoutLastPipe);
  if (previousPipeFields && previousPipeFields?.length) {
    const { root } = parse(queryText);
    const availableFields = await getCurrentQueryAvailableFields(
      queryText,
      root.commands,
      previousPipeFields
    );
    cache.set(queryText, availableFields);
  }
}

export function getFieldsByTypeHelper(queryText: string, resourceRetriever?: ESQLCallbacks) {
  const getFields = async () => {
    const queryForIndexFields = getFirstPipeValue(queryText);

    const output = processPipes(queryText);
    for (const line of output) {
      if (line === queryForIndexFields) {
        const existsInCache = cache.has(line);
        if (!existsInCache) {
          const fieldsWithMetadata = await getFieldsFromES(line, resourceRetriever);
          cache.set(line, fieldsWithMetadata);
        }
      } else {
        await setFieldsToCache(line);
      }
    }
  };

  return {
    getFieldsByType: async (
      expectedType: Readonly<string> | Readonly<string[]> = 'any',
      ignored: string[] = []
    ): Promise<ESQLRealField[]> => {
      const types = Array.isArray(expectedType) ? expectedType : [expectedType];
      await getFields();
      const queryTextForCacheSearch = toSingleLine(queryText);
      const cachedFields = cache.get(queryTextForCacheSearch);
      return (
        cachedFields?.filter(({ name, type }) => {
          const ts = Array.isArray(type) ? type : [type];
          return (
            !ignored.includes(name) &&
            ts.some((t) => types[0] === 'any' || types.includes(t)) &&
            !NOT_SUGGESTED_TYPES.includes(type)
          );
        }) || []
      );
    },
    getFieldsMap: async () => {
      await getFields();
      const queryTextForCacheSearch = toSingleLine(queryText);
      const cachedFields = cache.get(queryTextForCacheSearch);
      const cacheCopy = new Map<string, ESQLRealField>();
      cachedFields?.forEach((field) => cacheCopy.set(field.name, field));
      return cacheCopy;
    },
  };
}

export function getPolicyHelper(resourceRetriever?: ESQLCallbacks) {
  const getPolicies = async () => {
    return (await resourceRetriever?.getPolicies?.()) || [];
  };
  return {
    getPolicies: async () => {
      const policies = await getPolicies();
      return policies;
    },
    getPolicyMetadata: async (policyName: string) => {
      const policies = await getPolicies();
      return policies.find(({ name }) => name === policyName);
    },
  };
}

export function getSourcesHelper(resourceRetriever?: ESQLCallbacks) {
  return async () => {
    return (await resourceRetriever?.getSources?.()) || [];
  };
}
