/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getAstAndSyntaxErrors, Walker, walk, BasicPrettyPrinter } from '@kbn/esql-ast';

import type {
  ESQLSource,
  ESQLFunction,
  ESQLColumn,
  ESQLSingleAstItem,
  ESQLCommandOption,
} from '@kbn/esql-ast';

const DEFAULT_ESQL_LIMIT = 1000;

// retrieves the index pattern from the aggregate query for ES|QL using ast parsing
export function getIndexPatternFromESQLQuery(esql?: string) {
  const { ast } = getAstAndSyntaxErrors(esql);
  const sourceCommand = ast.find(({ name }) => ['from', 'metrics'].includes(name));
  const args = (sourceCommand?.args ?? []) as ESQLSource[];
  const indices = args.filter((arg) => arg.sourceType === 'index');
  return indices?.map((index) => index.name).join(',');
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
  const { ast } = getAstAndSyntaxErrors(esql);
  const limitCommands = ast.filter(({ name }) => name === 'limit');
  if (!limitCommands || !limitCommands.length) {
    return DEFAULT_ESQL_LIMIT;
  }
  const limits: number[] = [];

  walk(ast, {
    visitLiteral: (node) => {
      if (!isNaN(Number(node.value))) {
        limits.push(Number(node.value));
      }
    },
  });

  if (!limits.length) {
    return DEFAULT_ESQL_LIMIT;
  }

  // ES returns always the smallest limit
  return Math.min(...limits);
}

export function removeDropCommandsFromESQLQuery(esql?: string): string {
  const pipes = (esql || '').split('|');
  return pipes.filter((statement) => !/DROP\s/i.test(statement)).join('|');
}

/**
 * When the ?t_start and ?t_end params are used, we want to retrieve the timefield from the query.
 * @param esql:string
 * @returns string
 */
export const getTimeFieldFromESQLQuery = (esql: string) => {
  const { ast } = getAstAndSyntaxErrors(esql);
  const functions: ESQLFunction[] = [];

  walk(ast, {
    visitFunction: (node) => functions.push(node),
  });

  const params = Walker.params(ast);
  const timeNamedParam = params.find(
    (param) => param.value === 't_start' || param.value === 't_end'
  );
  if (!timeNamedParam || !functions.length) {
    return undefined;
  }
  const allFunctionsWithNamedParams = functions.filter(
    ({ location }) =>
      location.min <= timeNamedParam.location.min && location.max >= timeNamedParam.location.max
  );

  if (!allFunctionsWithNamedParams.length) {
    return undefined;
  }
  const lowLevelFunction = allFunctionsWithNamedParams[allFunctionsWithNamedParams.length - 1];

  const column = lowLevelFunction.args.find((arg) => {
    const argument = arg as ESQLSingleAstItem;
    return argument.type === 'column';
  }) as ESQLColumn;

  return column?.name;
};

export const isQueryWrappedByPipes = (query: string): boolean => {
  const { ast } = getAstAndSyntaxErrors(query);
  const numberOfCommands = ast.length;
  const pipesWithNewLine = query.split('\n  |');
  return numberOfCommands === pipesWithNewLine?.length;
};

export const prettifyQuery = (query: string, isWrapped: boolean): string => {
  const { ast } = getAstAndSyntaxErrors(query);
  return BasicPrettyPrinter.print(ast, { multiline: !isWrapped });
};

export const retrieveMetadataColumns = (esql: string): string[] => {
  const { ast } = getAstAndSyntaxErrors(esql);
  const options: ESQLCommandOption[] = [];

  walk(ast, {
    visitCommandOption: (node) => options.push(node),
  });
  const metadataOptions = options.find(({ name }) => name === 'metadata');
  return metadataOptions?.args.map((column) => (column as ESQLColumn).name) ?? [];
};
