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
  type ESQLAstCommand,
} from '../..';
import type { ESQLColumnData, ESQLPolicy } from '../commands/registry/types';
import type { ESQLAstHeaderCommand, ESQLAstQueryExpression } from '../types';
import type { IAdditionalFields } from '../commands/registry/registry';
import { enrichFieldsWithECSInfo } from './enrich_fields_with_ecs';

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
 * @param commands, the AST commands
 * @param previousPipeFields, the fields from the previous pipe
 * @param fetchFields, function to fetch fields from ES
 * @param getPolicies, function to get policies
 * @param originalQueryText, the original query text
 * @returns a list of fields that are available for the current pipe
 */
export async function getCurrentQueryAvailableColumns(
  commands: ESQLAstCommand[],
  previousPipeFields: ESQLColumnData[],
  fetchFields: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  getPolicies: () => Promise<Map<string, ESQLPolicy>>,
  originalQueryText: string
) {
  if (commands.length === 0) {
    return previousPipeFields;
  }
  const lastCommand = commands[commands.length - 1];
  const commandDef = esqlCommandRegistry.getCommandByName(lastCommand.name);
  if (!commandDef?.methods.columnsAfter) {
    return previousPipeFields;
  }

  const getJoinFields = createGetJoinFields(fetchFields);
  const getEnrichFields = createGetEnrichFields(fetchFields, getPolicies);
  const getFromFields = createGetFromFields(fetchFields);

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

export function getHeaderCommandAvailableColumns(
  headerCommands: ESQLAstHeaderCommand[],
  originalQueryText: string
) {
  if (headerCommands.length === 0) {
    return [];
  }
  const lastCommand = headerCommands[headerCommands.length - 1];
  const commandDef = esqlCommandRegistry.getCommandByName(lastCommand.name);
  if (!commandDef?.methods.columnsAfter) {
    return [];
  }

  if (commandDef?.methods.columnsAfter) {
    return commandDef.methods.columnsAfter(lastCommand, [], originalQueryText, {
      fromJoin: async () => [],
      fromEnrich: async () => [],
      fromFrom: async () => [],
    });
  }

  return [];
}
