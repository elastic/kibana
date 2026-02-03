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
import { isColumn, isFunctionExpression } from '../../../ast/is';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const newColumns: string[] = [];
  const renamedColumnsPairs: Array<[string, string]> = [];

  for (const arg of command.args) {
    if (isFunctionExpression(arg)) {
      if (arg.name === 'as') {
        // Syntax: old_name AS new_name
        // args[0] is old name, args[1] is new name
        const oldColumn = arg.args[0];
        const newColumn = arg.args[1];

        if (isColumn(oldColumn) && isColumn(newColumn)) {
          newColumns.push(newColumn.name);
          renamedColumnsPairs.push([newColumn.name, oldColumn.name]);
        }
      } else if (arg.name === '=') {
        // Syntax: new_name = old_name
        // args[0] is new name, args[1] is old name
        const newColumn = arg.args[0];
        const oldColumn = arg.args[1];

        if (isColumn(newColumn) && isColumn(oldColumn)) {
          newColumns.push(newColumn.name);
          renamedColumnsPairs.push([newColumn.name, oldColumn.name]);
        }
      }
    }
  }

  return {
    newColumns: new Set(newColumns),
    renamedColumnsPairs: new Set(renamedColumnsPairs),
  };
};
