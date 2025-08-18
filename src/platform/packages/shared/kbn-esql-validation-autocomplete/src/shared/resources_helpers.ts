/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@kbn/esql-ast';
import type { ESQLFieldWithMetadata } from '@kbn/esql-ast/src/commands_registry/types';
import type { ESQLCallbacks } from './types';
import { getFieldsFromES, getCurrentQueryAvailableFields } from './helpers';
import { removeLastPipe, processPipes, toSingleLine } from './query_string_utils';

export const NOT_SUGGESTED_TYPES = ['unsupported'];

const cache = new Map<string, ESQLFieldWithMetadata[]>();

// Function to check if a key exists in the cache, ignoring case
function checkCacheInsensitive(keyToCheck: string) {
  for (const key of cache.keys()) {
    if (key.toLowerCase() === keyToCheck.toLowerCase()) {
      return true; // Or return the value associated with the key if needed: return cache.get(key);
    }
  }
  return false;
}

// Function to get a value from the cache, ignoring case
function getValueInsensitive(keyToCheck: string) {
  for (const key of cache.keys()) {
    if (key.toLowerCase() === keyToCheck.toLowerCase()) {
      return cache.get(key);
    }
  }
  return undefined;
}

/**
 * Given a query, this function will compute the available fields and cache them
 * for the next time the same query is used.
 * @param queryText
 */
async function cacheFieldsForQuery(queryText: string) {
  const existsInCache = checkCacheInsensitive(queryText);
  if (existsInCache) {
    // this is already in the cache
    return;
  }
  const queryTextWithoutLastPipe = removeLastPipe(queryText);
  // retrieve the user defined fields from the query without an extra call
  const fieldsAvailableAfterPreviousCommand = getValueInsensitive(queryTextWithoutLastPipe);
  if (fieldsAvailableAfterPreviousCommand && fieldsAvailableAfterPreviousCommand?.length) {
    const { root } = parse(queryText);
    const availableFields = await getCurrentQueryAvailableFields(
      queryText,
      root.commands,
      fieldsAvailableAfterPreviousCommand
    );
    cache.set(queryText, availableFields);
  }
}

export function getFieldsByTypeHelper(queryText: string, resourceRetriever?: ESQLCallbacks) {
  const getFields = async () => {
    // in some cases (as in the case of ROW or SHOW) the query is not set
    if (!queryText) {
      return;
    }

    const [sourceCommand, ...partialQueries] = processPipes(queryText);

    // retrieve the index fields from ES ONLY if the source command is not in the cache
    const existsInCache = getValueInsensitive(sourceCommand);
    if (!existsInCache) {
      const fieldsWithMetadata = await getFieldsFromES(sourceCommand, resourceRetriever);
      cache.set(sourceCommand, fieldsWithMetadata);
    }

    // build fields cache for every partial query
    for (const query of partialQueries) {
      await cacheFieldsForQuery(query);
    }
  };

  return {
    getFieldsByType: async (
      expectedType: Readonly<string> | Readonly<string[]> = 'any',
      ignored: string[] = []
    ): Promise<ESQLFieldWithMetadata[]> => {
      const types = Array.isArray(expectedType) ? expectedType : [expectedType];
      await getFields();
      const queryTextForCacheSearch = toSingleLine(queryText);
      const cachedFields = getValueInsensitive(queryTextForCacheSearch);
      return (
        cachedFields?.filter(({ name, type }) => {
          const ts = Array.isArray(type) ? type : [type];
          return (
            !ignored.includes(name) &&
            (types[0] === 'any' || // if the type is 'any' we don't need to check the type
              ts.some((t) => types.includes(t))) &&
            !NOT_SUGGESTED_TYPES.includes(type)
          );
        }) || []
      );
    },
    getFieldsMap: async () => {
      await getFields();
      const queryTextForCacheSearch = toSingleLine(queryText);
      const cachedFields = getValueInsensitive(queryTextForCacheSearch);
      const cacheCopy = new Map<string, ESQLFieldWithMetadata>();
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
