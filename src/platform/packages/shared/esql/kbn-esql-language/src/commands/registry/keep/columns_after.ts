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
import { getFieldPatternMatcher } from '../../definitions/utils/regex';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string
) => {
  const columnsByName = new Map(previousColumns.map((column) => [column.name, column]));
  const groups: ESQLColumnData[][] = [];
  const winners = new Map<string, { precedence: number; group: ESQLColumnData[] }>();

  walk(command, {
    visitColumn: (node) => {
      const group: ESQLColumnData[] = [];
      groups.push(group);
      const matcher = getFieldPatternMatcher(node.text);
      if (!matcher) {
        winners.set(node.parts.join('.'), { precedence: 2, group });
        return;
      }

      // Exact names outrank partial patterns, which outrank '*'. Ties go to the rightmost selector.
      const selector = { precedence: node.text === '*' ? 0 : 1, group };
      for (const name of columnsByName.keys()) {
        const prior = winners.get(name);
        if ((!prior || selector.precedence >= prior.precedence) && matcher(name)) {
          winners.set(name, selector);
        }
      }
    },
  });

  for (const column of columnsByName.values()) {
    winners.get(column.name)?.group.push(column);
  }
  return groups.flat();
};
