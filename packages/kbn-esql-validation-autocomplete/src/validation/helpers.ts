/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLAst } from '@kbn/esql-ast';
import type { ESQLPolicy } from './types';

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
