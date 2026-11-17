/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn, isFunctionExpression, Parser } from '@elastic/esql';

/** Finds count and sparkline outputs whose meaning survives subsequent query commands. */
export const getMetricColumns = (esql: string): string[] => {
  const { root, errors } = Parser.parse(esql);
  const statsIndex = root.commands.findIndex(({ name }) => name === 'stats');
  if (errors.length || statsIndex === -1) {
    return [];
  }

  const columns = new Set<string>();
  for (const arg of root.commands[statsIndex].args) {
    if (!isFunctionExpression(arg)) {
      continue;
    }
    if (arg.name === 'count' || arg.name === 'sparkline') {
      columns.add(esql.substring(arg.location.min, arg.location.max + 1));
    } else if (arg.name === '=') {
      const [target, value] = arg.args.flat();
      if (
        isColumn(target) &&
        isFunctionExpression(value) &&
        (value.name === 'count' || value.name === 'sparkline')
      ) {
        columns.add(target.name);
      }
    }
  }

  // Track only projections and renames; other transformations may replace a metric's value.
  for (const command of root.commands.slice(statsIndex + 1)) {
    if (['sort', 'limit', 'where'].includes(command.name)) {
      continue;
    }
    if (command.name === 'keep' || command.name === 'drop') {
      const names = new Set<string>();
      for (const arg of command.args) {
        if (!isColumn(arg) || (!arg.quoted && arg.name.includes('*'))) {
          return [];
        }
        names.add(arg.name);
      }
      for (const name of columns) {
        if (command.name === 'keep' ? !names.has(name) : names.has(name)) {
          columns.delete(name);
        }
      }
      continue;
    }
    if (command.name === 'rename') {
      for (const arg of command.args) {
        if (!isFunctionExpression(arg) || !['as', '='].includes(arg.name)) {
          return [];
        }
        const [left, right] = arg.args.flat();
        if (
          !isColumn(left) ||
          !isColumn(right) ||
          (!left.quoted && left.name.includes('*')) ||
          (!right.quoted && right.name.includes('*'))
        ) {
          return [];
        }
        const [original, renamed] = arg.name === 'as' ? [left, right] : [right, left];
        const isMetric = columns.delete(original.name);
        columns.delete(renamed.name);
        if (isMetric) {
          columns.add(renamed.name);
        }
      }
      continue;
    }
    return [];
  }

  return [...columns];
};
