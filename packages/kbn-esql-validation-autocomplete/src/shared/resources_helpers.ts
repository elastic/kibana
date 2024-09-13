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

export function buildQueryUntilPreviousCommand(ast: ESQLAst, queryString: string) {
  const prevCommand = ast[Math.max(ast.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

// ECS Metadata is very static, so info only needs to be fetched once
class EcsMetadataCache {
  private static instance: EcsMetadataCache;
  private cacheEcsMetadata: Record<string, { type: string; source: string }> | undefined;

  private constructor() {}

  public static getInstance(): EcsMetadataCache {
    if (!EcsMetadataCache.instance) {
      EcsMetadataCache.instance = new EcsMetadataCache();
    }
    return EcsMetadataCache.instance;
  }

  public getMetadata(): Record<string, { type: string; source: string }> | undefined {
    return this.cacheEcsMetadata;
  }

  public setMetadata(metadata: Record<string, { type: string; source: string }>) {
    this.cacheEcsMetadata = metadata;
  }
}

export function getFieldsByTypeHelper(queryText: string, resourceRetriever?: ESQLCallbacks) {
  const cacheFields = new Map<string, ESQLRealField>();

  const getEcsMetadata = async () => {
    const cache = EcsMetadataCache.getInstance();
    if (!cache.getMetadata() && resourceRetriever?.getFieldsMetadata) {
      // Fetch full list of ECS field
      const client = await resourceRetriever?.getFieldsMetadata();
      if (client?.find) {
        const metadata = await client.find({
          attributes: ['type'],
        });
        cache.setMetadata(metadata?.fields);
      }
    }
    return cache.getMetadata();
  };

  const getFields = async () => {
    const metadata = await getEcsMetadata();
    if (!cacheFields.size && queryText) {
      const fieldsOfType = await resourceRetriever?.getFieldsFor?.({ query: queryText });
      const fieldsWithMetadata = enrichFieldsWithECSInfo(fieldsOfType || [], metadata);
      for (const field of fieldsWithMetadata || []) {
        cacheFields.set(field.name, field);
      }
    }
  };

  return {
    getFieldsByType: async (
      expectedType: string | string[] = 'any',
      ignored: string[] = []
    ): Promise<ESQLRealField[]> => {
      const types = Array.isArray(expectedType) ? expectedType : [expectedType];
      await getFields();
      return (
        Array.from(cacheFields.values())?.filter(({ name, type }) => {
          const ts = Array.isArray(type) ? type : [type];
          return !ignored.includes(name) && ts.some((t) => types[0] === 'any' || types.includes(t));
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
