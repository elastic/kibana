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
import { buildQueryForFieldsFromSource } from '../validation/helpers';
import { getFieldsFromES, getCurrentQueryAvailableFields } from './helpers';

export const NOT_SUGGESTED_TYPES = ['unsupported'];

export function buildQueryUntilPreviousCommand(ast: ESQLAst, queryString: string) {
  const prevCommand = ast[Math.max(ast.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

const cache = new Map<string, ESQLRealField[]>();

function removeLastPipe(inputString: string): string {
  const lastPipeIndex = inputString.lastIndexOf('|');
  if (lastPipeIndex !== -1) {
    return inputString.substring(0, lastPipeIndex).trimEnd();
  }
  return inputString.trimEnd();
}

function processPipes(inputString: string) {
  const parts = inputString.split('|');
  const results = [];
  let currentString = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (i === 0) {
      currentString = part;
    } else {
      currentString += ' | ' + part;
    }
    results.push(currentString.trim());
  }
  return results;
}

async function setFieldsToCache(queryText: string) {
  if (cache.has(queryText)) {
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
    const { root } = parse(queryText);
    const queryForIndexFields = buildQueryForFieldsFromSource(queryText, root.commands);
    if (queryForIndexFields === queryText && cache.has(queryForIndexFields)) {
      // this is already in the cache
      return;
    }
    // make the _query call only when the from <source> is not present in the cache
    if (queryForIndexFields && !cache.has(queryForIndexFields)) {
      const fieldsWithMetadata = await getFieldsFromES(queryForIndexFields, resourceRetriever);
      cache.set(queryForIndexFields, fieldsWithMetadata);
    } else {
      // Cache hit for queryText
      const output = processPipes(queryText);
      for (const line of output) {
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
      const cachedFields = cache.get(queryText);
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
      const cachedFields = cache.get(queryText);
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
