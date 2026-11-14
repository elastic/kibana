/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn } from '@elastic/esql';
import type { ESQLAstCommand } from '@elastic/esql/types';
import { getSummaryPerCommand } from './get_query_summary';
import { parseEsqlCached } from './parse_esql_cached';

const getColumnNames = (command: ESQLAstCommand): string[] =>
  command.args.flatMap((arg) => (isColumn(arg) ? [arg.parts.join('.')] : []));

/**
 * Returns the columns that the query creates (EVAL, STATS, DISSECT, ...) and that are still part of
 * its output, i.e. they were not discarded by a later STATS, KEEP, DROP or RENAME.
 * Index fields are not included, except the ones that a STATS groups by, as they are part of its output.
 * It is a static analysis, so there is no request to Elasticsearch.
 */
export const getComputedColumnsInOutput = (query: string): Set<string> => {
  const { root } = parseEsqlCached(query);
  let computed = new Set<string>();

  for (const command of root.commands) {
    const summary = getSummaryPerCommand(query, command);

    switch (command.name) {
      case 'stats':
        // the output of STATS are only its aggregates and groupings
        computed = new Set([
          ...summary.newColumns,
          ...[...(summary.grouping ?? [])].map(({ field }) => field),
        ]);
        break;
      case 'keep': {
        const kept = getColumnNames(command);
        // wildcards can keep any column, so the columns are left untouched
        if (!kept.some((name) => name.includes('*'))) {
          computed = new Set([...computed].filter((name) => kept.includes(name)));
        }
        break;
      }
      case 'drop':
        getColumnNames(command).forEach((name) => computed.delete(name));
        break;
      case 'rename':
        // pairs are [new name, old name]
        summary.renamedColumnsPairs?.forEach(([, oldName]) => computed.delete(oldName));
        summary.newColumns.forEach((name) => computed.add(name));
        break;
      default:
        summary.newColumns.forEach((name) => computed.add(name));
    }
  }

  return computed;
};
