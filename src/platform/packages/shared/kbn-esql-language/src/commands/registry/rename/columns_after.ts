/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import uniqBy from 'lodash/uniqBy';
import { isColumn, isFunctionExpression } from '../../../ast/is';
import type { ESQLAstBaseItem, ESQLCommand, ESQLFunction } from '../../../types';
import type { ESQLColumnData } from '../types';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string
) => {
  const asRenamePairs: ESQLFunction[] = [];
  const assignRenamePairs: ESQLFunction[] = [];

  for (const arg of command.args) {
    if (isFunctionExpression(arg)) {
      if (arg.name === 'as') {
        asRenamePairs.push(arg);
      } else if (arg.name === '=') {
        assignRenamePairs.push(arg);
      }
    }
  }

  // rename the columns with the user defined name
  const newFields = previousColumns.map<ESQLColumnData>((oldColumn) => {
    const asRenamePair = asRenamePairs.find(
      (pair) => (pair?.args?.[0] as ESQLAstBaseItem)?.name === oldColumn.name
    );

    if (isColumn(asRenamePair?.args?.[1])) {
      return {
        name: asRenamePair.args[1].name,
        type: oldColumn.type,
        location: asRenamePair.args[1].location,
        userDefined: true,
      };
    }

    const assignRenamePair = assignRenamePairs.find(
      (pair) => (pair?.args?.[1] as ESQLAstBaseItem)?.name === oldColumn.name
    );

    if (isColumn(assignRenamePair?.args?.[0])) {
      return {
        name: assignRenamePair.args[0].name,
        type: oldColumn.type,
        location: assignRenamePair.args[0].location,
        userDefined: true,
      };
    }

    return oldColumn; // No rename found, keep the old name
  });

  return uniqBy(newFields, 'name');
};
