/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ESQLAst,
  type ESQLAstQueryExpression,
  type ESQLColumn,
  type ESQLSource,
  type ESQLCommand,
  type FunctionDefinition,
  Walker,
} from '@kbn/esql-ast';
import { mutate, synth } from '@kbn/esql-ast';
import { ESQLPolicy } from '@kbn/esql-ast/src/commands_registry/types';

export function buildQueryForFieldsFromSource(queryString: string, ast: ESQLAst) {
  const firstCommand = ast[0];
  if (!firstCommand) return '';

  const sources: ESQLSource[] = [];
  const metadataFields: ESQLColumn[] = [];

  if (firstCommand.name === 'ts') {
    const timeseries = firstCommand as ESQLCommand<'ts'>;
    const tsSources = timeseries.args as ESQLSource[];

    sources.push(...tsSources);
  } else if (firstCommand.name === 'from') {
    const fromSources = mutate.commands.from.sources.list(firstCommand as any);
    const fromMetadataColumns = [...mutate.commands.from.metadata.list(firstCommand as any)].map(
      ([column]) => column
    );

    sources.push(...fromSources);
    if (fromMetadataColumns.length) metadataFields.push(...fromMetadataColumns);
  }

  const joinSummary = mutate.commands.join.summarize({
    type: 'query',
    commands: ast,
  } as ESQLAstQueryExpression);
  const joinIndices = joinSummary.map(({ target: { index } }) => index);

  if (joinIndices.length > 0) {
    sources.push(...joinIndices);
  }

  if (sources.length === 0) {
    return queryString.substring(0, firstCommand.location.max + 1);
  }

  const from =
    metadataFields.length > 0
      ? synth.cmd`FROM ${sources} METADATA ${metadataFields}`
      : synth.cmd`FROM ${sources}`;

  return from.toString();
}

export function buildQueryForFieldsInPolicies(policies: ESQLPolicy[]) {
  return `from ${policies
    .flatMap(({ sourceIndices }) => sourceIndices)
    .join(', ')} | keep ${policies.flatMap(({ enrichFields }) => enrichFields).join(', ')}`;
}

export function buildQueryForFieldsForStringSources(queryString: string, ast: ESQLAst) {
  // filter out the query until the last GROK or DISSECT command
  const lastCommandIndex =
    ast.length - [...ast].reverse().findIndex(({ name }) => ['grok', 'dissect'].includes(name));
  // we're sure it's not -1 because we check the commands chain before calling this function
  const nextCommandIndex = Math.min(lastCommandIndex + 1, ast.length - 1);
  const customQuery = queryString.substring(0, ast[nextCommandIndex].location.min).trimEnd();
  if (customQuery[customQuery.length - 1] === '|') {
    return customQuery.substring(0, customQuery.length - 1);
  }
  return customQuery;
}

/**
 * Returns the maximum and minimum number of parameters allowed by a function
 *
 * Used for too-many, too-few arguments validation
 */
export function getMaxMinNumberOfParams(definition: FunctionDefinition) {
  if (definition.signatures.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = Infinity;
  let max = 0;
  definition.signatures.forEach(({ params, minParams }) => {
    min = Math.min(min, params.filter(({ optional }) => !optional).length);
    max = Math.max(max, minParams ? Infinity : params.length);
  });
  return { min, max };
}

/**
 * Collects all 'enrich' commands from a list of ESQL commands.
 * @param commands - The list of ESQL commands to search through.
 * This function traverses the provided ESQL commands and collects all commands with the name 'enrich'.
 * @returns {ESQLCommand[]} - An array of ESQLCommand objects that represent the 'enrich' commands found in the input.
 */
export const getEnrichCommands = (commands: ESQLCommand[]): ESQLCommand[] =>
  Walker.matchAll(commands, { type: 'command', name: 'enrich' }) as ESQLCommand[];
