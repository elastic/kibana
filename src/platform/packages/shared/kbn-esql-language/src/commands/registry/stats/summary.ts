/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isAssignment, isColumn, isOptionNode } from '../../../ast/is';
import type { ESQLCommand, ESQLCommandOption } from '../../../types';
import type { ESQLCommandSummary } from '../types';

const getColumnNames = (
  command: ESQLCommand | ESQLCommandOption,
  query: string,
  isInByClause = false
): string[] => {
  const names: string[] = [];

  for (const expression of command.args) {
    if (isAssignment(expression) && isColumn(expression.args[0])) {
      // Assignment: name = expression (always creates a new column)
      const name = expression.args[0].parts.join('.');
      names.push(name);
      continue;
    }

    if (isOptionNode(expression) && expression.name === 'by') {
      // BY option
      names.push(...getColumnNames(expression, query, true));
      continue;
    }

    if (isColumn(expression)) {
      // Column reference: only include if NOT in BY clause
      if (!isInByClause) {
        const name = expression.parts.join('.');
        names.push(name);
      }
      continue;
    }

    if (!isOptionNode(expression) && !Array.isArray(expression)) {
      // Expression without assignment: uses the expression text as column name
      const name = query.substring(expression.location.min, expression.location.max + 1);
      names.push(name);
      continue;
    }
  }

  return names;
};

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const newColumns = getColumnNames(command, query);
  return { newColumns: new Set(newColumns) };
};
