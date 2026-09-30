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

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string
) => {
  const columnsToKeep: string[] = [];

  walk(command, {
    visitColumn: (node) => {
      columnsToKeep.push(node.parts.join('.'));
    },
  });

  const columnsByName = new Map(previousColumns.map((column) => [column.name, column]));
  const uniqueColumnsToKeep = columnsToKeep.filter(
    (name, index) => columnsToKeep.lastIndexOf(name) === index
  );

  // KEEP follows the written order and keeps the last occurrence of repeated columns.
  // For example, `KEEP a, b, a` returns `[b, a]`.
  // Multi-column IN uses this order to compare the fields on each side.
  return uniqueColumnsToKeep.flatMap((name) => {
    const column = columnsByName.get(name);

    return column ? [column] : [];
  });
};
