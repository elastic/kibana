/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BasicPrettyPrinter,
  Builder,
  ESQLAstQueryExpression,
  ESQLCommand,
  parse,
} from '@kbn/esql-ast';
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

export function buildQueryUntilPreviousCommand(queryString: string, commands: ESQLCommand[]) {
  const finalCommand = commands[commands.length - 1];
  if (finalCommand.name === 'fork') {
    const currentSubQuery = finalCommand.args[
      finalCommand.args.length - 1
    ] as ESQLAstQueryExpression;

    if (currentSubQuery.commands.length > 1) {
      // FORK requires at least two branches but we are
      // really only interested in the current branch so
      // this LIMIT branch is just to make the query pass
      // muster with Elasticsearch
      const limitBranch = Builder.expression.query([
        Builder.command<'limit'>({
          name: 'limit',
          args: [Builder.expression.literal.integer(0)],
        }),
      ]);

      const newForkCommand = Builder.command<'fork'>({
        name: 'fork',
        args: [
          limitBranch,
          { ...currentSubQuery, commands: currentSubQuery.commands.slice(0, -1) },
        ],
      });

      const query = Builder.expression.query([...commands.slice(0, -1), newForkCommand]);

      return BasicPrettyPrinter.print(query);
    }
  }

  const prevCommand = commands[Math.max(commands.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

const cache = new Map<string, ESQLRealField[]>();

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

async function setFieldsToCache(queryText: string) {
  const existsInCache = checkCacheInsensitive(queryText);
  if (existsInCache) {
    // this is already in the cache
    return;
  }
  const queryTextWithoutLastPipe = removeLastPipe(queryText);
  // retrieve the user defined fields from the query without an extra call
  const previousPipeFields = getValueInsensitive(queryTextWithoutLastPipe);
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
    // in some cases (as in the case of ROW or SHOW) the query is not set
    if (!queryText) {
      return;
    }
    // We will use the from clause to get the fields from the ES
    const queryForIndexFields = getFirstPipeValue(queryText);

    const output = processPipes(queryText);
    for (const line of output) {
      if (line === queryForIndexFields) {
        const existsInCache = getValueInsensitive(line);
        // retrieve the index fields from ES ONLY if the FROM clause is not in the cache
        if (!existsInCache) {
          const fieldsWithMetadata = await getFieldsFromES(line, resourceRetriever);
          cache.set(line, fieldsWithMetadata);
        }
      } else {
        // retrieve the fields by parsing the query
        // and set them to the cache, no extra call to ES
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
      const cachedFields = getValueInsensitive(queryTextForCacheSearch);
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
      const cachedFields = getValueInsensitive(queryTextForCacheSearch);
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
