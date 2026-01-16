/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCallbacks, ESQLFieldWithMetadata } from '@kbn/esql-types';
import {
  BasicPrettyPrinter,
  esqlCommandRegistry,
  isSource,
  mutate,
  synth,
  TRANSFORMATIONAL_COMMANDS,
  Walker,
  type ESQLAstCommand,
} from '../..';
import {
  UnmappedFieldsStrategy,
  type ESQLColumnData,
  type ESQLPolicy,
} from '../commands/registry/types';
import type { ESQLAstQueryExpression } from '../types';
import type { IAdditionalFields } from '../commands/registry/registry';
import { enrichFieldsWithECSInfo } from './enrich_fields_with_ecs';
import { columnIsPresent } from '../commands/definitions/utils/columns';
import { getUnmappedFieldType } from '../commands/definitions/utils/settings';

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

function createGetJoinFields(fetchFields: (query: string) => Promise<ESQLFieldWithMetadata[]>) {
  return (command: ESQLAstCommand): Promise<ESQLFieldWithMetadata[]> => {
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
}

function createGetEnrichFields(
  fetchFields: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  getPolicies: () => Promise<Map<string, ESQLPolicy>>
) {
  return async (command: ESQLAstCommand): Promise<ESQLFieldWithMetadata[]> => {
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
}

function createGetFromFields(fetchFields: (query: string) => Promise<ESQLFieldWithMetadata[]>) {
  return (command: ESQLAstCommand): Promise<ESQLFieldWithMetadata[]> => {
    return fetchFields(BasicPrettyPrinter.command(command));
  };
}
// Get the fields from the FROM clause, enrich them with ECS metadata
export async function getFieldsFromES(query: string, resourceRetriever?: ESQLCallbacks) {
  const metadata = await getEcsMetadata(resourceRetriever);
  const fieldsOfType = await resourceRetriever?.getColumnsFor?.({ query });
  const fieldsWithMetadata = enrichFieldsWithECSInfo(fieldsOfType || [], metadata);
  return fieldsWithMetadata;
}

/**
 * After KEEP or STATS, no new unmapped fields are added as they were erased by those destructive commands.
 */
export function areNewUnmappedFieldsAllowed(previousCommands: ESQLAstCommand[]): boolean {
  return !previousCommands.find((cmd) =>
    TRANSFORMATIONAL_COMMANDS.includes(cmd.name.toLowerCase())
  );
}

export function getUnmappedFields(
  command: ESQLAstCommand,
  previousCommands: ESQLAstCommand[],
  previousPipeFields: ESQLColumnData[],
  unmappedFieldsStrategy?: UnmappedFieldsStrategy
): ESQLColumnData[] {
  // Not collect unmmaped fields if the strategy is FAIL or undefined
  if (!unmappedFieldsStrategy || unmappedFieldsStrategy === UnmappedFieldsStrategy.FAIL) {
    return [];
  }

  // No unmaped fields can be collected after certain commands
  if (!areNewUnmappedFieldsAllowed(previousCommands)) {
    return [];
  }

  const unmappedFields: ESQLColumnData[] = [];
  const columsSet = new Set(previousPipeFields.map((col) => col.name));

  Walker.walk(command, {
    visitColumn: (node) => {
      if (
        !columnIsPresent(node, columsSet) &&
        unmappedFields.findIndex((f) => f.name === node.name) === -1
      ) {
        unmappedFields.push({
          name: node.parts.join('.'),
          type: getUnmappedFieldType(unmappedFieldsStrategy),
          isUnmappedField: true,
          userDefined: false,
        });
      }
    },
  });

  return unmappedFields;
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
  originalQueryText: string,
  unmappedFieldsStrategy?: UnmappedFieldsStrategy
) {
  if (commands.length === 0) {
    return previousPipeFields;
  }
  const lastCommand = commands[commands.length - 1];
  const commandDef = esqlCommandRegistry.getCommandByName(lastCommand.name);

  const getJoinFields = createGetJoinFields(fetchFields);
  const getEnrichFields = createGetEnrichFields(fetchFields, getPolicies);
  const getFromFields = createGetFromFields(fetchFields);

  const additionalFields: IAdditionalFields = {
    fromJoin: getJoinFields,
    fromEnrich: getEnrichFields,
    fromFrom: getFromFields,
  };

  const previousCommands = commands.slice(0, -1);
  const unmappedFields = getUnmappedFields(
    lastCommand,
    previousCommands,
    previousPipeFields,
    unmappedFieldsStrategy
  );

  const fields = [...previousPipeFields, ...unmappedFields];

  if (commandDef?.methods.columnsAfter) {
    return commandDef.methods.columnsAfter(
      lastCommand,
      fields,
      originalQueryText,
      additionalFields,
      unmappedFieldsStrategy ?? UnmappedFieldsStrategy.FAIL
    );
  }
  return fields;
}
