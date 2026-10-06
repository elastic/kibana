/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { ESQLAstHighlightCommand, ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { getHighlightColumnNames } from './utils';

export const columnsAfter = (command: ESQLCommand, previousColumns: ESQLColumnData[]) => {
  const highlightCommand = command as ESQLAstHighlightCommand;
  const highlightColumnNames = getHighlightColumnNames(highlightCommand);

  // Build a map from previous columns so we can replace on collision.
  // ES replaces same-named columns: empty prefix (`prefix = ""`) overwrites the source column.
  const columnMap = new Map<string, ESQLColumnData>(previousColumns.map((c) => [c.name, c]));

  for (const name of highlightColumnNames) {
    columnMap.set(name, {
      name,
      type: 'keyword' as const,
      userDefined: false,
    } as ESQLFieldWithMetadata);
  }

  return [...columnMap.values()];
};
