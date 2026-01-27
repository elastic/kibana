/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import uniqBy from 'lodash/uniqBy';
import { isAssignment, isColumn, isFunctionExpression, isOptionNode } from '../../../ast/is';
import type { SupportedDataType } from '../../definitions/types';
import { getExpressionType } from '../../definitions/utils';
import type { ESQLAstItem, ESQLCommand, ESQLCommandOption } from '../../../types';
import type { ESQLColumnData, ESQLUserDefinedColumn, UnmappedFieldsStrategy } from '../types';
import type { IAdditionalFields } from '../registry';

const getUserDefinedColumns = (
  command: ESQLCommand | ESQLCommandOption,
  typeOf: (thing: ESQLAstItem) => SupportedDataType | 'unknown',
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
      const assignment = expression.args[0];

      if (isAssignment(assignment) && isColumn(assignment.args[0])) {
        const name = assignment.args[0].parts.join('.');
        const newColumn: ESQLUserDefinedColumn = {
          name,
          type: typeOf(assignment.args[1]),
          location: assignment.args[0].location,
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
  const columnMap = new Map<string, ESQLColumnData>();
  previousColumns.forEach((col) => columnMap.set(col.name, col)); // TODO make this more efficient

  const typeOf = (thing: ESQLAstItem) =>
    getExpressionType(thing, columnMap, unmappedFieldsStrategy);

  return uniqBy([...getUserDefinedColumns(command, typeOf, query)], 'name');
};
