/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { parse, Walker, walk, EsqlQuery, isFunctionExpression, isColumn } from '@kbn/esql-ast';

import type {
  ESQLSource,
  ESQLFunction,
  ESQLColumn,
  ESQLSingleAstItem,
  ESQLInlineCast,
  ESQLCommandOption,
} from '@kbn/esql-ast';
import { type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { monaco } from '@kbn/monaco';

const DEFAULT_ESQL_LIMIT = 1000;

// retrieves the index pattern from the aggregate query for ES|QL using ast parsing
export function getIndexPatternFromESQLQuery(esql?: string) {
  const { ast } = parse(esql);
  const sourceCommand = ast.find(({ name }) => ['from', 'ts'].includes(name));
  const args = (sourceCommand?.args ?? []) as ESQLSource[];
  const indices = args.filter((arg) => arg.sourceType === 'index');
  return indices?.map((index) => index.name).join(',');
}

// For ES|QL we consider stats and keep transformational command
// The metrics command too but only if it aggregates
export function hasTransformationalCommand(esql?: string) {
  const transformationalCommands = ['stats', 'keep'];
  const { ast } = parse(esql);
  const hasAtLeastOneTransformationalCommand = transformationalCommands.some((command) =>
    ast.find(({ name }) => name === command)
  );
  return hasAtLeastOneTransformationalCommand;
}

export function getLimitFromESQLQuery(esql: string): number {
  const { ast } = parse(esql);
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
 * When the ?_tstart and ?_tend params are used, we want to retrieve the timefield from the query.
 * @param esql:string
 * @returns string
 */
export const getTimeFieldFromESQLQuery = (esql: string) => {
  const { ast } = parse(esql);
  const functions: ESQLFunction[] = [];

  walk(ast, {
    visitFunction: (node) => functions.push(node),
  });

  const params = Walker.params(ast);
  const timeNamedParam = params.find(
    (param) => param.value === '_tstart' || param.value === '_tend'
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

  let columnName: string | undefined;

  lowLevelFunction.args.some((arg) => {
    const argument = arg as ESQLSingleAstItem | ESQLInlineCast<ESQLSingleAstItem>;
    if (argument.type === 'column') {
      columnName = argument.name;
      return true;
    }

    if (
      argument.type === 'inlineCast' &&
      (argument as ESQLInlineCast<ESQLSingleAstItem>).value.type === 'column'
    ) {
      columnName = (argument as ESQLInlineCast<ESQLSingleAstItem>).value.name;
      return true;
    }

    return false;
  });

  return columnName;
};

export const isQueryWrappedByPipes = (query: string): boolean => {
  const { ast } = parse(query);
  const numberOfCommands = ast.length;
  const pipesWithNewLine = query.split('\n  |');
  return numberOfCommands === pipesWithNewLine?.length;
};

export const prettifyQuery = (src: string): string => {
  const query = EsqlQuery.fromSrc(src);
  return query.print({ multiline: true, indent: '  ' });
};

export const retrieveMetadataColumns = (esql: string): string[] => {
  const { ast } = parse(esql);
  const options: ESQLCommandOption[] = [];

  walk(ast, {
    visitCommandOption: (node) => options.push(node),
  });
  const metadataOptions = options.find(({ name }) => name === 'metadata');
  return metadataOptions?.args.map((column) => (column as ESQLColumn).name) ?? [];
};

export const getQueryColumnsFromESQLQuery = (esql: string): string[] => {
  const { root } = parse(esql);
  const columns: ESQLColumn[] = [];

  walk(root, {
    visitColumn: (node) => columns.push(node),
  });

  return columns.map((column) => column.name);
};

export const getESQLQueryVariables = (esql: string): string[] => {
  const { root } = parse(esql);
  const usedVariablesInQuery = Walker.params(root);
  return usedVariablesInQuery.map((v) => v.text.replace(/^\?+/, ''));
};

/**
 * This function is used to map the variables to the columns in the datatable
 * @param esql:string
 * @param variables:ESQLControlVariable[]
 * @param columns:DatatableColumn[]
 * @returns DatatableColumn[]
 */
export const mapVariableToColumn = (
  esql: string,
  variables: ESQLControlVariable[],
  columns: DatatableColumn[]
): DatatableColumn[] => {
  if (!variables.length) {
    return columns;
  }
  const usedVariablesInQuery = getESQLQueryVariables(esql);
  const uniqueVariablesInQyery = new Set<string>(usedVariablesInQuery);

  columns.map((column) => {
    if (variables.some((variable) => variable.value === column.id)) {
      const potentialColumnVariables = variables.filter((variable) => variable.value === column.id);
      const variable = potentialColumnVariables.find((v) => uniqueVariablesInQyery.has(v.key));
      column.variable = variable?.key ?? '';
    }
  });
  return columns;
};

export const getQueryUpToCursor = (queryString: string, cursorPosition?: monaco.Position) => {
  const lines = queryString.split('\n');
  const lineNumber = cursorPosition?.lineNumber ?? lines.length;
  const column = cursorPosition?.column ?? lines[lineNumber - 1].length;

  // Handle the case where the cursor is within the first line
  if (lineNumber === 1) {
    return lines[0].slice(0, column);
  }

  // Get all lines up to the specified line number (exclusive of the current line)
  const previousLines = lines.slice(0, lineNumber - 1).join('\n');
  const currentLine = lines[lineNumber - 1].slice(0, column);

  // Join the previous lines and the partial current line
  return previousLines + '\n' + currentLine;
};

const hasQuestionMarkAtEndOrSecondLastPosition = (queryString: string) => {
  if (typeof queryString !== 'string' || queryString.length === 0) {
    return false;
  }

  const lastChar = queryString.slice(-1);
  const secondLastChar = queryString.slice(-2, -1);

  return lastChar === '?' || secondLastChar === '?';
};

export const getValuesFromQueryField = (queryString: string, cursorPosition?: monaco.Position) => {
  const queryInCursorPosition = getQueryUpToCursor(queryString, cursorPosition);

  if (hasQuestionMarkAtEndOrSecondLastPosition(queryInCursorPosition)) {
    return undefined;
  }

  const validQuery = `${queryInCursorPosition} ""`;
  const { root } = parse(validQuery);
  const lastCommand = root.commands[root.commands.length - 1];
  const columns: ESQLColumn[] = [];

  walk(lastCommand, {
    visitColumn: (node) => columns.push(node),
  });

  const column = Walker.match(lastCommand, { type: 'column' });

  if (column && column.name && column.name !== '*') {
    return `${column.name}`;
  }
};

// this is for backward compatibility, if the query is of fields or functions type
// and the query is not set with ?? in the query, we should set it
// https://github.com/elastic/elasticsearch/pull/122459
export const fixESQLQueryWithVariables = (
  queryString: string,
  esqlVariables?: ESQLControlVariable[]
) => {
  const currentVariables = getESQLQueryVariables(queryString);
  if (!currentVariables.length) {
    return queryString;
  }

  // filter out the variables that are not used in the query
  // and that they are not of type FIELDS or FUNCTIONS
  const identifierTypeVariables = esqlVariables?.filter(
    (variable) =>
      currentVariables.includes(variable.key) &&
      (variable.type === ESQLVariableType.FIELDS || variable.type === ESQLVariableType.FUNCTIONS)
  );

  // check if they are set with ?? or ? in the query
  // replace only if there is only one ? in front of the variable
  if (identifierTypeVariables?.length) {
    identifierTypeVariables.forEach((variable) => {
      const regex = new RegExp(`(?<!\\?)\\?${variable.key}`);
      queryString = queryString.replace(regex, `??${variable.key}`);
    });
    return queryString;
  }

  return queryString;
};

export const getCategorizeColumns = (esql: string): string[] => {
  const { root } = parse(esql);
  const statsCommand = root.commands.find(({ name }) => name === 'stats');
  if (!statsCommand) {
    return [];
  }
  const options: ESQLCommandOption[] = [];
  const columns: string[] = [];

  walk(statsCommand, {
    visitCommandOption: (node) => options.push(node),
  });

  const statsByOptions = options.find(({ name }) => name === 'by');

  // categorize is part of the stats by command
  if (!statsByOptions) {
    return [];
  }

  const categorizeOptions = statsByOptions.args.filter((arg) => {
    return (arg as ESQLFunction).text.toLowerCase().indexOf('categorize') !== -1;
  }) as ESQLFunction[];

  if (categorizeOptions.length) {
    categorizeOptions.forEach((arg) => {
      // ... STATS ... BY CATEGORIZE(field)
      if (isFunctionExpression(arg) && arg.name === 'categorize') {
        columns.push(arg.text);
      } else {
        // ... STATS ... BY pattern = CATEGORIZE(field)
        const columnArgs = arg.args.filter((a) => isColumn(a));
        columnArgs.forEach((c) => columns.push((c as ESQLColumn).name));
      }
    });
  }

  // If there is a rename command, we need to check if the column is renamed
  const renameCommand = root.commands.find(({ name }) => name === 'rename');
  if (!renameCommand) {
    return columns;
  }
  const renameFunctions: ESQLFunction[] = [];
  walk(renameCommand, {
    visitFunction: (node) => renameFunctions.push(node),
  });

  renameFunctions.forEach((renameFunction) => {
    const { original, renamed } = getArgsFromRenameFunction(renameFunction);
    const oldColumn = original.name;
    const newColumn = renamed.name;
    if (columns.includes(oldColumn)) {
      columns[columns.indexOf(oldColumn)] = newColumn;
    }
  });
  return columns;
};

/**
 * Extracts the original and renamed columns from a rename function.
 * RENAME original AS renamed Vs RENAME renamed = original
 * @param renameFunction
 */
export const getArgsFromRenameFunction = (
  renameFunction: ESQLFunction
): { original: ESQLColumn; renamed: ESQLColumn } => {
  if (renameFunction.name === 'as') {
    return {
      original: renameFunction.args[0] as ESQLColumn,
      renamed: renameFunction.args[1] as ESQLColumn,
    };
  }

  return {
    original: renameFunction.args[1] as ESQLColumn,
    renamed: renameFunction.args[0] as ESQLColumn,
  };
};

/**
 * Extracts the fields used in the CATEGORIZE function from an ESQL query.
 * @param esql: string - The ESQL query string
 */
export const getCategorizeField = (esql: string): string[] => {
  const { root } = parse(esql);
  const columns: string[] = [];
  const functions = Walker.matchAll(root.commands, {
    type: 'function',
    name: 'categorize',
  }) as ESQLFunction[];

  if (functions.length) {
    functions.forEach((func) => {
      for (const arg of func.args) if (isColumn(arg)) columns.push(arg.name);
    });
    return columns;
  }

  return columns;
};
