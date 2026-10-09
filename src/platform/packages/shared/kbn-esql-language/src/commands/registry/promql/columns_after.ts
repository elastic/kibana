/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLAstPromqlCommand } from '@elastic/esql/types';
import type { ESQLColumnData, ESQLUserDefinedColumn } from '../types';
import type { IAdditionalFields } from '../registry';
import { findPipeOutsideQuotes } from '../../definitions/utils/shared';
import { getPromqlOutputMetadata, getPromqlUserDefinedColumn, PromqlParamName } from './utils';

export const columnsAfter = async (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[],
  query: string,
  { fromPromql }: IAdditionalFields
): Promise<ESQLColumnData[]> => {
  const promqlCommand = command as ESQLAstPromqlCommand;
  const pipeIndex = findPipeOutsideQuotes(query, promqlCommand.location.min);
  const sourceColumns = fromPromql ? await fromPromql(promqlCommand) : [];

  if (pipeIndex === -1) {
    return sourceColumns;
  }

  const userDefinedColumn = getUserDefinedColumn(promqlCommand);
  const stepColumn = getStepColumn(promqlCommand);

  const { expressionColumn, metrics, breakdownLabels } = getPromqlOutputColumns(
    promqlCommand,
    query,
    !!userDefinedColumn
  );

  const sourceByName = new Map(sourceColumns.map((column) => [column.name, column]));

  return buildColumns({
    stepColumn,
    userDefinedColumn,
    expressionColumn,
    sourceByName,
    metrics,
    breakdownLabels,
  });
};

function getUserDefinedColumn(command: ESQLAstPromqlCommand): ESQLUserDefinedColumn | undefined {
  // Grammar: valueName is always UNQUOTED_IDENTIFIER | QUOTED_IDENTIFIER
  const target = getPromqlUserDefinedColumn(command);
  if (!target) {
    return undefined;
  }

  return {
    name: target.name,
    type: 'unknown', // TODO: infer type once PROMQL query AST is available,
    location: target.location,
    userDefined: true,
  };
}

function getStepColumn(command: ESQLAstPromqlCommand): ESQLColumnData | undefined {
  if (!command.query) {
    return undefined;
  }

  return {
    name: PromqlParamName.Step,
    type: 'date',
    userDefined: false,
  };
}

function getPromqlOutputColumns(
  command: ESQLAstPromqlCommand,
  query: string,
  hasUserDefinedColumn: boolean
): {
  expressionColumn: ESQLUserDefinedColumn | undefined;
  metrics: Set<string>;
  breakdownLabels: Set<string>;
} {
  const { expression, metrics, breakdownLabels } = getPromqlOutputMetadata(command);

  const expressionColumn =
    expression && expression.type !== 'selector' && !hasUserDefinedColumn
      ? {
          name: query.substring(expression.location.min, expression.location.max + 1),
          type: 'unknown' as const,
          location: expression.location,
          userDefined: true as const,
        }
      : undefined;
  const includeMetrics = expression?.type === 'selector' && !hasUserDefinedColumn;

  if (!includeMetrics) {
    return { expressionColumn, metrics: new Set(), breakdownLabels };
  }

  return { expressionColumn, metrics, breakdownLabels };
}

function buildColumns({
  stepColumn,
  userDefinedColumn,
  expressionColumn,
  sourceByName,
  metrics,
  breakdownLabels,
}: {
  stepColumn: ESQLColumnData | undefined;
  userDefinedColumn: ESQLUserDefinedColumn | undefined;
  expressionColumn: ESQLColumnData | undefined;
  sourceByName: Map<string, ESQLColumnData>;
  metrics: Set<string>;
  breakdownLabels: Set<string>;
}): ESQLColumnData[] {
  const columnNames = new Set<string>();
  let columns: ESQLColumnData[] = [];

  columns = appendColumn(columns, columnNames, stepColumn);
  columns = appendColumn(columns, columnNames, userDefinedColumn);
  columns = appendColumn(columns, columnNames, expressionColumn);
  columns = appendPromqlFields(columns, columnNames, sourceByName, metrics);
  columns = appendPromqlFields(columns, columnNames, sourceByName, breakdownLabels);

  return columns;
}

function appendPromqlFields(
  columns: ESQLColumnData[],
  columnNames: Set<string>,
  sourceByName: Map<string, ESQLColumnData>,
  names: Set<string>
): ESQLColumnData[] {
  let nextColumns = columns;

  for (const name of names) {
    const sourceColumn = sourceByName.get(name);
    nextColumns = appendColumn(nextColumns, columnNames, {
      name,
      type: sourceColumn?.type ?? 'unknown',
      userDefined: false,
    });
  }

  return nextColumns;
}

function appendColumn(
  columns: ESQLColumnData[],
  columnNames: Set<string>,
  column: ESQLColumnData | undefined
): ESQLColumnData[] {
  if (!column || columnNames.has(column.name)) {
    return columns;
  }

  columnNames.add(column.name);
  return [...columns, column];
}
