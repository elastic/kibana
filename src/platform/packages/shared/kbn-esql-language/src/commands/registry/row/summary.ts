/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '../../../types';
import type { ESQLCommandSummary } from '../types';
import { isAssignment, isColumn } from '../../../ast/is';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const newColumns: string[] = [];

  for (const expression of command.args) {
    if (isAssignment(expression) && isColumn(expression.args[0])) {
      // Assignment: name = value
      const name = expression.args[0].parts.join('.');
      newColumns.push(name);
    } else if (!Array.isArray(expression)) {
      // Expression without assignment: uses the expression text as column name
      const name = query.substring(expression.location.min, expression.location.max + 1);
      newColumns.push(name);
    }
  }

  return {
    newColumns: new Set(newColumns),
  };
};
