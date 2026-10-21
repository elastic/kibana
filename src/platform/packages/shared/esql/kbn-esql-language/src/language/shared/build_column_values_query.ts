/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression, ESQLCommand } from '@elastic/esql/types';
import { Builder } from '@elastic/esql';

interface BuildColumnValuesQueryOptions {
  /** Max number of rows read from the source before any processing. */
  sampleSize?: number;
  /** Max number of distinct values returned. */
  limit?: number;
}

const limitCommand = (value: number): ESQLCommand<'limit'> =>
  Builder.command({ name: 'limit', args: [Builder.expression.literal.integer(value)] });

/**
 * Builds a query which returns a sorted sample of the distinct values of a column.
 *
 * E.g. for column "ds":
 *
 * Original query: FROM logs | SORT timestamp DESC | RENAME clientip AS ds
 * Result:         FROM logs | LIMIT 10000 | SORT timestamp DESC | RENAME clientip AS ds | STATS BY ds | SORT ds | LIMIT 20
 */
export const buildColumnValuesQuery = (
  root: ESQLAstQueryExpression,
  columnName: string,
  { sampleSize = 10000, limit = 20 }: BuildColumnValuesQueryOptions = {}
): ESQLAstQueryExpression => {
  const [sourceCommand, ...processingCommands] = root.commands;
  if (!sourceCommand) {
    return root;
  }

  // Split dotted names into parts so `host.name` prints as host.name instead of `host.name`.
  const column = () => Builder.expression.column(columnName.split('.'));

  const statsCommand = Builder.command({
    name: 'stats',
    args: [Builder.option({ name: 'by', args: [column()] })],
  });

  const sortCommand = Builder.command({
    name: 'sort',
    args: [column()],
  });

  return {
    ...root,
    commands: [
      sourceCommand,
      limitCommand(sampleSize),
      ...processingCommands,
      statsCommand,
      sortCommand,
      limitCommand(limit),
    ],
  };
};
