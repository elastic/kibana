/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isAssignment, isColumn, isOptionNode } from '../../../ast/is';
import type { ESQLColumn, ESQLCommand, ESQLCommandOption } from '../../../types';
import type { ESQLCommandSummary } from '../types';

// The enrich command can add new columns with the WITH option.
export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const withOption = command.args.find((arg) => isOptionNode(arg) && arg.name === 'with') as
    | ESQLCommandOption
    | undefined;

  if (!withOption || !withOption.args) {
    return { newColumns: new Set([]) };
  }
  const newColumns: string[] = [];
  const renamedColumnsPairs: Array<[string, string]> = [];

  const processArgument = async (arg: unknown) => {
    if (!isAssignment(arg)) return;
    const leftColumn = arg.args[0] as ESQLColumn;
    if (isColumn(leftColumn)) {
      if (Array.isArray(arg.args[1]) && isColumn(arg.args[1][0])) {
        const rightColumn = arg.args[1][0];
        if (rightColumn && leftColumn && rightColumn.name !== leftColumn.name) {
          newColumns.push(leftColumn.name);
          renamedColumnsPairs.push([leftColumn.name, rightColumn.name]);
        }
      }
    }
  };

  withOption?.args.forEach(processArgument);

  return {
    newColumns: new Set(newColumns),
    renamedColumnsPairs: new Set(renamedColumnsPairs),
  };
};
