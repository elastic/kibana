/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isAssignment, isColumn, isFunctionExpression, isOptionNode } from '@elastic/esql';
import type { ESQLAstItem, ESQLCommand, ESQLCommandOption } from '@elastic/esql/types';
import type { SupportedDataType } from '../../definitions/types';
import { getExpressionType } from '../../definitions/utils';
import type { ESQLColumnData, ESQLUserDefinedColumn, UnmappedFieldsStrategy } from '../types';
import type { IAdditionalFields } from '../registry';
import { getColumnsDefinedInByClause, isByOption } from './utils';

type ExpressionType = (thing: ESQLAstItem) => SupportedDataType | 'unknown';

/**
 * Keeps the last column for each name, preserving order.
 * When a name is reused, the rightmost definition wins, matching how
 * Elasticsearch resolves repeated BY assignments and aggregation/grouping collisions.
 */
const keepLastByName = (columns: ESQLUserDefinedColumn[]): ESQLUserDefinedColumn[] => {
  const lastIndexByName = new Map<string, number>();
  columns.forEach((column, index) => lastIndexByName.set(column.name, index));
  return columns.filter((column, index) => lastIndexByName.get(column.name) === index);
};

const getUserDefinedColumns = (
  command: ESQLCommand | ESQLCommandOption,
  typeOf: ExpressionType,
  query: string
): ESQLUserDefinedColumn[] => {
  const columns: ESQLUserDefinedColumn[] = [];

  for (const expression of command.args) {
    if (isAssignment(expression) && isColumn(expression.args[0])) {
      const name = expression.args[0].parts.join('.');
      const newColumn: ESQLUserDefinedColumn = {
        name,
        type: typeOf(expression.args[1]),
        location: expression.args[0].location,
        userDefined: true,
      };
      columns.push(newColumn);
      continue;
    }

    if (isOptionNode(expression) && expression.name === 'by') {
      columns.push(...getUserDefinedColumns(expression, typeOf, query));
      continue;
    }

    if (isFunctionExpression(expression) && expression.name === 'where') {
      const outputExpression = expression.args[0];

      if (!outputExpression || Array.isArray(outputExpression)) {
        continue;
      }

      if (isAssignment(outputExpression) && isColumn(outputExpression.args[0])) {
        const [targetColumn, valueExpression] = outputExpression.args;
        const name = targetColumn.parts.join('.');
        const newColumn: ESQLUserDefinedColumn = {
          name,
          type: typeOf(valueExpression),
          location: targetColumn.location,
          userDefined: true,
        };
        columns.push(newColumn);
        continue;
      }

      if (!isOptionNode(outputExpression)) {
        const newColumn: ESQLUserDefinedColumn = {
          name: query.substring(expression.location.min, expression.location.max + 1),
          type: typeOf(outputExpression),
          location: expression.location,
          userDefined: true,
        };
        columns.push(newColumn);
      }

      continue;
    }

    if (isColumn(expression)) {
      const name = expression.parts.join('.');
      const newColumn: ESQLUserDefinedColumn = {
        name,
        type: typeOf(expression),
        location: expression.location,
        userDefined: true,
      };
      columns.push(newColumn);
      continue;
    }

    if (!isOptionNode(expression) && !Array.isArray(expression)) {
      const newColumn: ESQLUserDefinedColumn = {
        name: query.substring(expression.location.min, expression.location.max + 1),
        type: typeOf(expression),
        location: expression.location,
        userDefined: true,
      };
      columns.push(newColumn);
      continue;
    }
  }

  return columns;
};

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string,
  additionalFields: IAdditionalFields,
  unmappedFieldsStrategy: UnmappedFieldsStrategy
) => {
  const inputColumns = new Map<string, ESQLColumnData>();
  previousColumns.forEach((col) => inputColumns.set(col.name, col)); // TODO make this more efficient

  const assignments = getColumnsDefinedInByClause(
    command,
    inputColumns,
    query,
    unmappedFieldsStrategy
  );
  const aggregatingColumns = new Map([...inputColumns, ...assignments]);

  // Aggregation expressions can reference columns defined in the BY clause, while
  // the BY expressions themselves are typed using the input columns only.
  const typeOf = (thing: ESQLAstItem) =>
    getExpressionType(thing, aggregatingColumns, unmappedFieldsStrategy);
  const byTypeOf = (thing: ESQLAstItem) =>
    getExpressionType(thing, inputColumns, unmappedFieldsStrategy);

  const aggregatingArgs: ESQLAstItem[] = [];
  const byArgs: ESQLAstItem[] = [];
  for (const arg of command.args) {
    if (isByOption(arg)) {
      byArgs.push(arg);
    } else {
      aggregatingArgs.push(arg);
    }
  }

  return keepLastByName([
    ...getUserDefinedColumns({ ...command, args: aggregatingArgs }, typeOf, query),
    ...getUserDefinedColumns({ ...command, args: byArgs }, byTypeOf, query),
  ]);
};
