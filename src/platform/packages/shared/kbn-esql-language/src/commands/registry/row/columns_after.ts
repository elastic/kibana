/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAssignment, isColumn } from '../../../ast/is';
import { getExpressionType } from '../../definitions/utils';
import type { ESQLAstItem, ESQLCommand } from '../../../types';
import type { ESQLColumnData, ESQLUserDefinedColumn } from '../types';

export const columnsAfter = (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[], // will always be empty for ROW
  query: string
) => {
  const typeOf = (thing: ESQLAstItem) => getExpressionType(thing, new Map());

  const columns = [];

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
    } else if (!Array.isArray(expression)) {
      const newColumn: ESQLUserDefinedColumn = {
        name: query.substring(expression.location.min, expression.location.max + 1),
        type: typeOf(expression),
        location: expression.location,
        userDefined: true,
      };
      columns.push(newColumn);
    }
  }

  return columns;
};
