/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ESQLSource, ESQLFunction, ESQLColumn } from '@kbn/esql-ast';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';

const DEFAULT_ESQL_LIMIT = 500;

// retrieves the index pattern from the aggregate query for ES|QL using ast parsing
export function getIndexPatternFromESQLQuery(esql?: string) {
  const { ast } = getAstAndSyntaxErrors(esql);
  const sourceCommand = ast.find(({ name }) => ['from', 'metrics'].includes(name));
  const args = (sourceCommand?.args ?? []) as ESQLSource[];
  const indices = args.filter((arg) => arg.sourceType === 'index');
  return indices?.map((index) => index.text).join(',');
}

// For ES|QL we consider stats and keep transformational command
// The metrics command too but only if it aggregates
export function hasTransformationalCommand(esql?: string) {
  const transformationalCommands = ['stats', 'keep'];
  const { ast } = getAstAndSyntaxErrors(esql);
  const hasAtLeastOneTransformationalCommand = transformationalCommands.some((command) =>
    ast.find(({ name }) => name === command)
  );
  if (hasAtLeastOneTransformationalCommand) {
    return true;
  }
  const metricsCommand = ast.find(({ name }) => name === 'metrics');

  if (metricsCommand && 'aggregates' in metricsCommand) {
    return true;
  }

  return false;
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

/**
 * The ?latest and ?earliest named parameters are used to pass the timepicker time range to the ESQL query.
 * @param esql:string
 * @returns boolean
 */
export const hasTimeNamedParams = (esql: string) => {
  return /\?earliest/i.test(esql) && /\?latest/i.test(esql);
};

/**
 * When the ?earliest and ?latest params are used, we want to retrieve the timefield from the query.
 * @param esql:string
 * @returns string
 */
export const getTimeFieldFromESQLQuery = (esql: string) => {
  const { ast } = getAstAndSyntaxErrors(esql);
  const whereCommand = ast.find(({ name }) => name === 'where');
  const whereClause =
    whereCommand && esql.substring(whereCommand?.location.min, whereCommand?.location.max);
  if (!whereClause) {
    return;
  }
  // const matches = whereClause.match(new RegExp(field + '(.*)' + String(filterValue)));
  // not sure if the best way to add this here is with ast parsing or with regex,
  // we need to add the named parameters first to the lexer and parser
  const args = (whereCommand?.args ?? []) as ESQLFunction[];
  const functionArgs = args.filter((arg) => arg.type === 'function');
  const timeFieldArg = (functionArgs[0].args as ESQLColumn[]).find((arg) => arg.type === 'column');
  return timeFieldArg?.text;
};
