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
} from '@kbn/esql-ast';
import type {
  ESQLColumnData,
  ESQLFieldWithMetadata,
  ESQLPolicy,
} from '@kbn/esql-ast/src/commands_registry/types';
import type { ESQLAstQueryExpression } from '@kbn/esql-ast/src/types';

import type { IAdditionalFields } from '@kbn/esql-ast/src/commands_registry/registry';
import { enrichFieldsWithECSInfo } from './enrich_fields_with_ecs';
import type { ESQLCallbacks } from '../shared/types';

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
