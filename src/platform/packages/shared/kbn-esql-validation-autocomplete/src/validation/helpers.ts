/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLAst,
  ESQLAstItem,
  ESQLAstMetricsCommand,
  ESQLMessage,
  ESQLSingleAstItem,
} from '@kbn/esql-ast';
import { FunctionDefinition } from '../definitions/types';
import { getAllArrayTypes, getAllArrayValues } from '../shared/helpers';
import { getMessageFromId } from './errors';
import type { ESQLPolicy, ReferenceMaps } from './types';

export function buildQueryForFieldsFromSource(queryString: string, ast: ESQLAst) {
  const firstCommand = ast[0];
  if (!firstCommand) return '';
  if (firstCommand.name === 'metrics') {
    const metrics = firstCommand as ESQLAstMetricsCommand;
    return `FROM ${metrics.sources.map((source) => source.name).join(', ')}`;
  }
  return queryString.substring(0, firstCommand.location.max + 1);
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
 * We only want to report one message when any number of the elements in an array argument is of the wrong type
 */
export function collapseWrongArgumentTypeMessages(
  messages: ESQLMessage[],
  arg: ESQLAstItem[],
  funcName: string,
  argType: string,
  parentCommand: string,
  references: ReferenceMaps
) {
  if (!messages.some(({ code }) => code === 'wrongArgumentType')) {
    return messages;
  }

  // Replace the individual "wrong argument type" messages with a single one for the whole array
  messages = messages.filter(({ code }) => code !== 'wrongArgumentType');

  // @TODO: remove
  console.log(`--@@collapseWrongArgumentTypeMessages messages`, messages);
  messages.push(
    getMessageFromId({
      messageId: 'wrongArgumentType',
      values: {
        name: funcName,
        argType,
        value: `(${getAllArrayValues(arg).join(', ')})`,
        givenType: `(${getAllArrayTypes(arg, parentCommand, references).join(', ')})`,
      },
      locations: {
        min: (arg[0] as ESQLSingleAstItem).location.min,
        max: (arg[arg.length - 1] as ESQLSingleAstItem).location.max,
      },
    })
  );

  return messages;
}
