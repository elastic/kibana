/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { type ESQLSource, getAstAndSyntaxErrors } from '@kbn/esql-ast';

const DEFAULT_ESQL_LIMIT = 500;

// retrieves the index pattern from the aggregate query for ES|QL using ast parsing
export function getIndexPatternFromESQLQuery(esql?: string) {
  const { ast } = getAstAndSyntaxErrors(esql);
  const fromCommand = ast.find(({ name }) => name === 'from');
  const args = (fromCommand?.args ?? []) as ESQLSource[];
  const indices = args.filter((arg) => arg.sourceType === 'index');
  return indices?.map((index) => index.text).join(',');
}

export function getLimitFromESQLQuery(esql: string): number {
  const limitCommands = esql.match(new RegExp(/LIMIT\s[0-9]+/, 'ig'));
  if (!limitCommands) {
    return DEFAULT_ESQL_LIMIT;
  }

  const lastIndex = limitCommands.length - 1;
  const split = limitCommands[lastIndex].split(' ');
  return parseInt(split[1], 10);
}

export function removeDropCommandsFromESQLQuery(esql?: string): string {
  const pipes = (esql || '').split('|');
  return pipes.filter((statement) => !/DROP\s/i.test(statement)).join('|');
}
