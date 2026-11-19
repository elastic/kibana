/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '@elastic/esql/types';
import { walk } from '@elastic/esql';
import type { ESQLColumnData } from '../types';
import { isWildcardColumn, matchesWildcardPattern } from '../../definitions/utils/regex';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string
) => {
  const columnsByName = new Map(previousColumns.map((column) => [column.name, column]));
  const columnsToKeep: ESQLColumnData[] = [];

  walk(command, {
    visitColumn: ({ parts, text }) => {
      const name = parts.join('.');

      // A pattern adds the matching columns that are not kept yet, in their input order.
      if (isWildcardColumn(name, text)) {
        const matches = previousColumns.filter(
          (column) => matchesWildcardPattern(name, column.name) && !columnsToKeep.includes(column)
        );
        columnsToKeep.push(...matches);
        return;
      }

      // An exact name moves its column to the end: `KEEP a, b, a` returns `[b, a]`.
      const column = columnsByName.get(name);
      if (!column) {
        return;
      }
      const index = columnsToKeep.indexOf(column);
      if (index !== -1) {
        columnsToKeep.splice(index, 1);
      }
      columnsToKeep.push(column);
    },
  });

  // Multi-column IN uses this order to compare the fields on each side.
  return columnsToKeep;
};
