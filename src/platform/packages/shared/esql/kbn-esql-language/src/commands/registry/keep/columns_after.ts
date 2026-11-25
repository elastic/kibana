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
  const columns = [...columnsByName.values()];
  const selections: ESQLColumnData[][] = [];
  const winners = new Map<string, { precedence: number; index: number }>();

  walk(command, {
    visitColumn: (node) => {
      const matcher = getFieldPatternMatcher(node.text);
      const precedence = node.text === '*' ? 0 : matcher ? 1 : 2;
      const column = columnsByName.get(node.parts.join('.'));
      const selected = matcher
        ? columns.filter((field) => matcher(field.name))
        : column
        ? [column]
        : [];
      const index = selections.push(selected) - 1;

      // Exact names outrank partial patterns, which outrank '*'. Ties go to the rightmost selector.
      for (const { name } of selected) {
        const prior = winners.get(name);
        if (!prior || precedence >= prior.precedence) {
          winners.set(name, { precedence, index });
        }
      }
    },
  });

  return selections.flatMap((selected, index) =>
    selected.filter(({ name }) => winners.get(name)?.index === index)
  );
};
