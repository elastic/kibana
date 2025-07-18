/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  type ESQLAstCommand,
  esqlCommandRegistry,
  type FieldType,
  type FunctionDefinition,
} from '@kbn/esql-ast';
import type {
  ESQLFieldWithMetadata,
  ESQLUserDefinedColumn,
} from '@kbn/esql-ast/src/commands_registry/types';
import { ESQLLocation, ESQLParamLiteral } from '@kbn/esql-ast/src/types';
import { uniqBy } from 'lodash';

import { enrichFieldsWithECSInfo } from '../autocomplete/utils/ecs_metadata_helper';
import type { ESQLCallbacks } from './types';
import { collectUserDefinedColumns } from './user_defined_columns';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

export const within = (position: number, location: ESQLLocation | undefined) =>
  Boolean(location && location.min <= position && location.max >= position);

export function isSourceCommand({ label }: { label: string }) {
  return ['FROM', 'ROW', 'SHOW', 'TS'].includes(label);
}

export function createMapFromList<T extends { name: string }>(arr: T[]): Map<string, T> {
  const arrMap = new Map<string, T>();
  for (const item of arr) {
    arrMap.set(item.name, item);
  }
  return arrMap;
}

export function areFieldAndUserDefinedColumnTypesCompatible(
  fieldType: string | string[] | undefined,
  userColumnType: string | string[]
) {
  if (fieldType == null) {
    return false;
  }
  return fieldType === userColumnType;
}

export const isParam = (x: unknown): x is ESQLParamLiteral =>
  !!x &&
  typeof x === 'object' &&
  (x as ESQLParamLiteral).type === 'literal' &&
  (x as ESQLParamLiteral).literalType === 'param';

/**
 * Compares two strings in a case-insensitive manner
 */
export const noCaseCompare = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Given a function signature, returns the parameter at the given position.
 *
 * Takes into account variadic functions (minParams), returning the last
 * parameter if the position is greater than the number of parameters.
 *
 * @param signature
 * @param position
 * @returns
 */
export function getParamAtPosition(
  { params, minParams }: FunctionDefinition['signatures'][number],
  position: number
) {
  return params.length > position ? params[position] : minParams ? params[params.length - 1] : null;
}

// --- Fields helpers ---

export function transformMapToESQLFields(
  inputMap: Map<string, ESQLUserDefinedColumn[]>
): ESQLFieldWithMetadata[] {
  const esqlFields: ESQLFieldWithMetadata[] = [];

  for (const [, userDefinedColumns] of inputMap) {
    for (const userDefinedColumn of userDefinedColumns) {
      // Only include userDefinedColumns that have a known type
      if (userDefinedColumn.type) {
        esqlFields.push({
          name: userDefinedColumn.name,
          type: userDefinedColumn.type as FieldType,
        });
      }
    }
  }

  return esqlFields;
}

async function getEcsMetadata(resourceRetriever?: ESQLCallbacks) {
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
}
// Get the fields from the FROM clause, enrich them with ECS metadata
export async function getFieldsFromES(query: string, resourceRetriever?: ESQLCallbacks) {
  const metadata = await getEcsMetadata();
  const fieldsOfType = await resourceRetriever?.getColumnsFor?.({ query });
  const fieldsWithMetadata = enrichFieldsWithECSInfo(fieldsOfType || [], metadata);
  return fieldsWithMetadata;
}

/**
 * @param query, the ES|QL query
 * @param commands, the AST commands
 * @param previousPipeFields, the fields from the previous pipe
 * @returns a list of fields that are available for the current pipe
 */
export async function getCurrentQueryAvailableFields(
  query: string,
  commands: ESQLAstCommand[],
  previousPipeFields: ESQLFieldWithMetadata[]
) {
  const cacheCopy = new Map<string, ESQLFieldWithMetadata>();
  previousPipeFields.forEach((field) => cacheCopy.set(field.name, field));
  const lastCommand = commands[commands.length - 1];
  const commandDefinition = esqlCommandRegistry.getCommandByName(lastCommand.name);

  // If the command has a columnsAfter function, use it to get the fields
  if (commandDefinition?.methods.columnsAfter) {
    const userDefinedColumns = collectUserDefinedColumns([lastCommand], cacheCopy, query);

    return commandDefinition.methods.columnsAfter(lastCommand, previousPipeFields, {
      userDefinedColumns,
    });
  } else {
    // If the command doesn't have a columnsAfter function, use the default behavior
    const userDefinedColumns = collectUserDefinedColumns(commands, cacheCopy, query);
    const arrayOfUserDefinedColumns: ESQLFieldWithMetadata[] = transformMapToESQLFields(
      userDefinedColumns ?? new Map<string, ESQLUserDefinedColumn[]>()
    );
    const allFields = uniqBy([...(previousPipeFields ?? []), ...arrayOfUserDefinedColumns], 'name');
    return allFields;
  }
}
