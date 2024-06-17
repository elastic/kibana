/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLAst } from '@kbn/esql-ast';
import type { ESQLCallbacks } from './types';
import type { ESQLRealField } from '../validation/types';

export function buildQueryUntilPreviousCommand(ast: ESQLAst, queryString: string) {
  const prevCommand = ast[Math.max(ast.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

export function getFieldsByTypeHelper(queryText: string, resourceRetriever?: ESQLCallbacks) {
  const cacheFields = new Map<string, ESQLRealField>();
  const getFields = async () => {
    if (!cacheFields.size && queryText) {
      const fieldsOfType = await resourceRetriever?.getFieldsFor?.({ query: queryText });
      for (const field of fieldsOfType || []) {
        cacheFields.set(field.name, field);
      }
    }
  };
  return {
    getFieldsByType: async (expectedType: string | string[] = 'any', ignored: string[] = []) => {
      const types = Array.isArray(expectedType) ? expectedType : [expectedType];
      await getFields();
      return (
        Array.from(cacheFields.values())
          ?.filter(({ name, type }) => {
            const ts = Array.isArray(type) ? type : [type];
            return (
              !ignored.includes(name) && ts.some((t) => types[0] === 'any' || types.includes(t))
            );
          })
          .map(({ name }) => name) || []
      );
    },
    getFieldsMap: async () => {
      await getFields();
      const cacheCopy = new Map<string, ESQLRealField>();
      cacheFields.forEach((value, key) => cacheCopy.set(key, value));
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
