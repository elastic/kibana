/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAst } from '@kbn/esql-ast';
import type { ESQLCallbacks } from './types';
import type { ESQLRealField } from '../validation/types';
import { enrichFieldsWithECSInfo } from '../autocomplete/utils/ecs_metadata_helper';

export const NOT_SUGGESTED_TYPES = ['unsupported'];

export function buildQueryUntilPreviousCommand(ast: ESQLAst, queryString: string) {
  const prevCommand = ast[Math.max(ast.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

export function getFieldsByTypeHelper(queryText: string, resourceRetriever?: ESQLCallbacks) {
  const cacheFields = new Map<string, ESQLRealField>();

  const getEcsMetadata = async () => {
    if (!resourceRetriever?.getFieldsMetadata) {
      return undefined;
    }
    const client = await resourceRetriever?.getFieldsMetadata;
    if (client.find) {
      // Fetch full list of ECS field
      // This list should be cached already by fieldsMetadataClient
      const results = await client.find({ attributes: ['type'] });
      return results?.fields;
    }
  };

  const getFields = async () => {
    const metadata = await getEcsMetadata();
    if (!cacheFields.size && queryText) {
      const fieldsOfType = await resourceRetriever?.getColumnsFor?.({ query: queryText });
      const fieldsWithMetadata = enrichFieldsWithECSInfo(fieldsOfType || [], metadata);
      for (const field of fieldsWithMetadata || []) {
        cacheFields.set(field.name, field);
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
      return (
        Array.from(cacheFields.values())?.filter(({ name, type }) => {
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
