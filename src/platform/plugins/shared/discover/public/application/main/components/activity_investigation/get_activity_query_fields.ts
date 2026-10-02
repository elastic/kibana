/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAssignment, isColumn, isFunctionExpression, walk } from '@elastic/esql';
import type { ESQLColumn, ESQLCommand } from '@elastic/esql/types';
import { escapeRegExp } from 'lodash';

const columnName = (column: ESQLColumn): string | undefined =>
  column.args.every(({ type }) => type === 'identifier') ? column.parts.join('.') : undefined;

/** Identifies final-output fields explicitly selected, filtered, created or renamed by the query. */
export const getActivityQueryFields = (
  commands: readonly ESQLCommand[],
  columns: readonly { readonly name: string }[]
): ReadonlySet<string> => {
  const selected = new Set<string>();
  for (const command of commands) {
    if (command.name === 'keep') {
      walk(command, {
        visitColumn: (column) => {
          const name = columnName(column);
          if (name === undefined) return;
          // KEEP * is not a preference for any particular field; narrower patterns are.
          if (name === '*' && column.text === '*') return;
          const pattern = column.args
            .map((part) =>
              part.text.startsWith('`')
                ? escapeRegExp(part.name)
                : part.name.split('*').map(escapeRegExp).join('.*')
            )
            .join('\\.');
          const matcher = new RegExp(`^${pattern}$`);
          for (const output of columns) {
            if (matcher.test(output.name)) selected.add(output.name);
          }
        },
      });
    } else if (command.name === 'where') {
      walk(command, {
        visitColumn: (column) => {
          const name = columnName(column);
          if (name !== undefined) selected.add(name);
        },
      });
    } else if (command.name === 'eval' || command.name === 'rename') {
      for (const expression of command.args) {
        const target =
          command.name === 'eval' && isAssignment(expression)
            ? expression.args[0]
            : command.name === 'rename' && isFunctionExpression(expression)
            ? expression.args[expression.name === 'as' ? 1 : 0]
            : undefined;
        if (!isColumn(target)) continue;
        const name = columnName(target);
        if (name !== undefined) selected.add(name);
      }
    }
  }

  return new Set(columns.filter(({ name }) => selected.has(name)).map(({ name }) => name));
};
