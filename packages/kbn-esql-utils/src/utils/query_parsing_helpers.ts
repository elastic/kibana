/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ESQLSource, ESQLFunction, ESQLColumn, ESQLSingleAstItem } from '@kbn/esql-ast';
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
  // should fetch from the AST
  return /\?earliest/i.test(esql) && /\?latest/i.test(esql);
};

// should use here the new walk function, hasnt been merged yet
function findInAst(astItem: ESQLFunction, variable: string): string | undefined {
  const singleAstItem = astItem as ESQLFunction;
  const args = singleAstItem.args;
  const isLastNode = args?.some((a) => 'type' in a && a.type === 'column');
  if (isLastNode) {
    const column = args.find((a) => {
      const argument = a as ESQLSingleAstItem;
      return argument.type === 'column';
    }) as ESQLColumn;
    if (column) {
      return column.name;
    }
  } else {
    const functions = args?.filter((item) => 'type' in item && item.type === 'function');
    for (const functionAstItem of functions) {
      const item = findInAst(functionAstItem as ESQLFunction, variable);
      if (item) {
        return item;
      }
    }
  }
  return undefined;
}

/**
 * When the ?earliest and ?latest params are used, we want to retrieve the timefield from the query.
 * @param esql:string
 * @returns string
 */
export const getTimeFieldFromESQLQuery = (esql: string) => {
  const { ast } = getAstAndSyntaxErrors(esql);
  const whereCommand = ast.find(({ name }) => name === 'where');
  if (!whereCommand) {
    return;
  }
  return (
    findInAst(whereCommand as unknown as ESQLFunction, '?earliest') ??
    findInAst(whereCommand as unknown as ESQLFunction, '?latest')
  );
};
