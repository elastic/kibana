/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { escapeEsqlColumnName } from '@kbn/esql-language';
import { appendToESQLQuery } from './utils';

const CATEGORIZE_COUNT_COLUMN = 'Count';
const CATEGORIZE_PATTERN_COLUMN = 'Pattern';

// Trailing commands that only shape the displayed rows. They are dropped so that
// CATEGORIZE runs over every matching document instead of e.g. the first LIMIT rows.
const DROPPABLE_TRAILING_COMMANDS: ReadonlySet<string> = new Set(['limit', 'sort', 'keep', 'drop']);

/**
 * Appends a `STATS ... BY CATEGORIZE(field)` pipeline to the query, removing trailing LIMIT/SORT/KEEP/DROP commands first.
 */
export const appendCategorizeToESQLQuery = (esql: string, field: string): string => {
  const { root } = Parser.parse(esql);
  const { commands } = root;

  let lastKeptIndex = commands.length - 1;
  while (lastKeptIndex > 0 && DROPPABLE_TRAILING_COMMANDS.has(commands[lastKeptIndex].name)) {
    lastKeptIndex--;
  }

  const baseQuery =
    lastKeptIndex === commands.length - 1
      ? esql
      : esql.substring(0, commands[lastKeptIndex].location.max + 1);

  const escapedField = escapeEsqlColumnName(field);

  return appendToESQLQuery(
    baseQuery,
    `| STATS ${CATEGORIZE_COUNT_COLUMN} = COUNT(*) BY ${CATEGORIZE_PATTERN_COLUMN} = CATEGORIZE(${escapedField})\n| SORT ${CATEGORIZE_COUNT_COLUMN} DESC`
  );
};
