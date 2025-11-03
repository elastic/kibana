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
  esqlCommandRegistry,
  isSource,
  mutate,
  synth,
  type ESQLAstCommand,
  type FunctionDefinition,
} from '@kbn/esql-ast';
import type {
  ESQLColumnData,
  ESQLFieldWithMetadata,
  ESQLPolicy,
} from '@kbn/esql-ast/src/commands_registry/types';
import type { ESQLAstQueryExpression, ESQLParamLiteral } from '@kbn/esql-ast/src/types';

import type { IAdditionalFields } from '@kbn/esql-ast/src/commands_registry/registry';
import { enrichFieldsWithECSInfo } from '../autocomplete/utils/ecs_metadata_helper';
import type { ESQLCallbacks } from './types';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

export function isSourceCommandSuggestion({ label }: { label: string }) {
  return ['FROM', 'ROW', 'SHOW', 'TS'].includes(label);
}

export function isHeaderCommandSuggestion({ label }: { label: string }) {
  return label === 'SET';
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
export async function getCurrentQueryAvailableColumns(
  commands: ESQLAstCommand[],
  previousPipeFields: ESQLColumnData[],
  fetchFields: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  getPolicies: () => Promise<Map<string, ESQLPolicy>>,
  originalQueryText: string
) {
  const lastCommand = commands[commands.length - 1];
  const commandDef = esqlCommandRegistry.getCommandByName(lastCommand.name);

  const getJoinFields = (command: ESQLAstCommand): Promise<ESQLFieldWithMetadata[]> => {
    const joinSummary = mutate.commands.join.summarize({
      type: 'query',
      commands: [command],
    } as ESQLAstQueryExpression);
    const joinIndices = joinSummary.map(({ target: { index } }) => index);
    if (joinIndices.length > 0) {
      const joinFieldQuery = synth.cmd`FROM ${joinIndices}`.toString();
      return fetchFields(joinFieldQuery);
    }
    return Promise.resolve([]);
  };

  const getEnrichFields = async (command: ESQLAstCommand): Promise<ESQLFieldWithMetadata[]> => {
    if (!isSource(command.args[0])) {
      return [];
    }

    const policyName = command.args[0].name;

    const policies = await getPolicies();
    const policy = policies.get(policyName);

    if (policy) {
      const fieldsQuery = `FROM ${policy.sourceIndices.join(
        ', '
      )} | KEEP ${policy.enrichFields.join(', ')}`;
      return fetchFields(fieldsQuery);
    }

    return [];
  };

  const getFromFields = (command: ESQLAstCommand): Promise<ESQLFieldWithMetadata[]> => {
    return fetchFields(BasicPrettyPrinter.command(command));
  };

  const additionalFields: IAdditionalFields = {
    fromJoin: getJoinFields,
    fromEnrich: getEnrichFields,
    fromFrom: getFromFields,
  };

  if (commandDef?.methods.columnsAfter) {
    return commandDef.methods.columnsAfter(
      lastCommand,
      previousPipeFields,
      originalQueryText,
      additionalFields
    );
  }
  return previousPipeFields;
}
