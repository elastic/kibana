/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLAst, ESQLAstItem, ESQLMessage, ESQLSingleAstItem } from '@kbn/esql-ast';
import { getAllArrayTypes, getAllArrayValues } from '../shared/helpers';
import { getMessageFromId } from './errors';
import type { ESQLPolicy, ReferenceMaps } from './types';

export function buildQueryForFieldsFromSource(queryString: string, ast: ESQLAst) {
  const firstCommand = ast[0];
  if (firstCommand == null) {
    return '';
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
