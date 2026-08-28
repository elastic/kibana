/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, isFunctionExpression, isColumn } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';

/**
 * Ensures the given column survives all KEEP commands in the list, tracking
 * renames so the current column name is appended where missing.
 */
export const preserveColumnInKeepCommands = (commands: ESQLCommand[], columnName: string): void => {
  let currentName = columnName;
  for (const command of commands) {
    currentName = applyRenameCommandToColumn(command, currentName);
    if (
      command.name === 'keep' &&
      !command.args.some((arg) => isColumn(arg) && arg.name === currentName)
    ) {
      command.args.push(Builder.expression.column(currentName));
    }
  }
};

/**
 * Applies a single RENAME command to a column name, returning the resulting
 * name. Handles both `RENAME old AS new` and `RENAME new = old` forms.
 */
const applyRenameCommandToColumn = (command: ESQLCommand, columnName: string): string => {
  if (command.name !== 'rename') return columnName;
  let currentName = columnName;
  for (const arg of command.args) {
    if (Array.isArray(arg) || !isFunctionExpression(arg)) continue;
    const [left, right] = arg.args;
    if (Array.isArray(left) || Array.isArray(right) || !isColumn(left) || !isColumn(right)) {
      continue;
    }
    if (arg.name === 'as' && left.name === currentName) {
      currentName = right.name;
    } else if (arg.name === '=' && right.name === currentName) {
      currentName = left.name;
    }
  }
  return currentName;
};

/** Resolves the final column name after all RENAME commands in the list. */
export const applyRenamesToColumn = (commands: ESQLCommand[], columnName: string): string =>
  commands.reduce((name, command) => applyRenameCommandToColumn(command, name), columnName);
