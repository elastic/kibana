/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isAssignment, isColumn, isFunctionExpression } from '../../../ast/is';
import type { ESQLColumn, ESQLCommand } from '../../../types';
import type { ESQLCommandSummary } from '../types';

// The enrich command can add new columns with the assignment or without
export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const newColumns: string[] = [];

  const processArgument = async (arg: unknown) => {
    // EVAL col = expr
    if (isAssignment(arg) && isColumn(arg.args[0])) {
      const leftColumn = arg.args[0] as ESQLColumn;
      newColumns.push(leftColumn.name);
      // EVAL func(...)
    } else if (isFunctionExpression(arg) && arg.text) {
      newColumns.push(arg.text);
    }
  };

  command.args.forEach(processArgument);

  return { newColumns: new Set(newColumns) };
};
