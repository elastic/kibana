/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@kbn/esql-ast';
import type {
  ESQLColumnData,
  ESQLFieldWithMetadata,
  ESQLPolicy,
} from '@kbn/esql-ast/src/commands_registry/types';
import type { ESQLCallbacks } from './types';
import { getFieldsFromES, getCurrentQueryAvailableColumns } from './helpers';
import { removeLastPipe, processPipes, toSingleLine } from './query_string_utils';

export const NOT_SUGGESTED_TYPES = ['unsupported'];

const cache = new Map<string, ESQLColumnData[]>();

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
async function cacheColumnsForQuery(
  queryText: string,
  fetchFields: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  policies: Map<string, ESQLPolicy>
) {
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
    const availableFields = await getCurrentQueryAvailableColumns(
      queryText,
      root.commands,
      fieldsAvailableAfterPreviousCommand,
      fetchFields,
      policies
    );
    cache.set(queryText, availableFields);
  }
}

export function getColumnsByTypeHelper(queryText: string, resourceRetriever?: ESQLCallbacks) {
  const getColumns = async () => {
    // in some cases (as in the case of ROW or SHOW) the query is not set
    if (!queryText) {
      return;
    }

    const getFields = async (query: string) => {
      const cached = getValueInsensitive(query);
      if (cached) {
        return cached as ESQLFieldWithMetadata[];
      }
      const fields = await getFieldsFromES(query, resourceRetriever);
      cache.set(query, fields);
      return fields;
    };

    const [sourceCommand, ...partialQueries] = processPipes(queryText);
    getFields(sourceCommand);

    const policies = (await resourceRetriever?.getPolicies?.()) ?? [];
    const policyMap = new Map(policies.map((p) => [p.name, p]));

    // build fields cache for every partial query
    for (const query of partialQueries) {
      await cacheColumnsForQuery(query, getFields, policyMap);
    }
  };

  return {
    getColumnsByType: async (
      expectedType: Readonly<string> | Readonly<string[]> = 'any',
      ignored: string[] = []
    ): Promise<ESQLColumnData[]> => {
      const types = Array.isArray(expectedType) ? expectedType : [expectedType];
      await getColumns();
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
    getColumnMap: async (): Promise<Map<string, ESQLColumnData>> => {
      await getColumns();
      const queryTextForCacheSearch = toSingleLine(queryText);
      const cachedFields = getValueInsensitive(queryTextForCacheSearch);
      const cacheCopy = new Map<string, ESQLColumnData>();
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
