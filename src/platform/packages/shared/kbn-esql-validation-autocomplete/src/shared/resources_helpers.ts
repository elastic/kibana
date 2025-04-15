/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniq } from 'lodash';
import { type ESQLAst, type ESQLColumn, parse, walk } from '@kbn/esql-ast';
import type { ESQLCallbacks } from './types';
import type { ESQLRealField, ESQLVariable } from '../validation/types';
import { collectVariables } from './variables';
import { enrichFieldsWithECSInfo } from '../autocomplete/utils/ecs_metadata_helper';
import { buildQueryForFieldsFromSource } from '../validation/helpers';
import type { FieldType } from '../definitions/types';

export const NOT_SUGGESTED_TYPES = ['unsupported'];
const TRANSFORMATIONAL_COMMANDS = ['stats', 'keep'];

export function buildQueryUntilPreviousCommand(ast: ESQLAst, queryString: string) {
  const prevCommand = ast[Math.max(ast.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

function transformMapToRealFields(inputMap: Map<string, ESQLVariable[]>): ESQLRealField[] {
  const realFields: ESQLRealField[] = [];

  for (const [, variables] of inputMap) {
    for (const variable of variables) {
      // Only include variables that have a known type
      if (variable.type !== 'unknown') {
        realFields.push({
          name: variable.name,
          type: variable.type as FieldType, // Type assertion since we've filtered out 'unknown'
        });
      }
    }
  }

  return realFields;
}

// contains only the fields that exist in the index (pattern) and are not user defined
const cache = new Map<string, ESQLRealField[]>();

export function getFieldsByTypeHelper(queryText: string, resourceRetriever?: ESQLCallbacks) {
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

  const { root } = parse(queryText);
  const queryForIndexFields = buildQueryForFieldsFromSource(queryText, root.commands);

  const getFields = async () => {
    const metadata = await getEcsMetadata();

    if (queryForIndexFields && !cache.has(queryForIndexFields)) {
      const fieldsOfType = await resourceRetriever?.getColumnsFor?.({ query: queryText });
      const fieldsWithMetadata = enrichFieldsWithECSInfo(fieldsOfType || [], metadata);
      cache.set(queryForIndexFields, fieldsWithMetadata);
    } else {
      const indexFields = cache.get(queryForIndexFields);

      const cacheCopy = new Map<string, ESQLRealField>();
      indexFields?.forEach((field) => cacheCopy.set(field.name, field));
      const userDefinedColumns = collectVariables(root.commands, cacheCopy, queryText);
      const arrayOfUserDefinedColumns: ESQLRealField[] = transformMapToRealFields(
        userDefinedColumns ?? new Map<string, ESQLVariable[]>()
      );
      const allFields = uniq([...(indexFields ?? []), ...arrayOfUserDefinedColumns]);

      const lastCommand = root.commands[root.commands.length - 1];
      const isTransformationalCommand = TRANSFORMATIONAL_COMMANDS.includes(lastCommand.name);
      if (isTransformationalCommand) {
        // If the last command is transformational, we need to set only the available fields
        const columns: ESQLColumn[] = [];

        walk(lastCommand, {
          visitColumn: (node) => columns.push(node),
        });
        const available = allFields.filter((field) => {
          return columns.some((column) => column.name === field.name);
        });
        cache.set(queryText, available);
      } else {
        cache.set(queryText, allFields);
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
      const cachedFields = cache.get(queryForIndexFields);
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
