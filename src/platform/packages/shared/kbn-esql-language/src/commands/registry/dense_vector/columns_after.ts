/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstDenseVectorCommand, ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { getDenseVectorColumnNames } from './utils';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[]
): ESQLColumnData[] => {
  const denseVectorCommand = command as ESQLAstDenseVectorCommand;

  // Keyed by name so a generated column replaces a same-named one, which is what ES does when
  // an explicit `target =` or suffix collides with a column already in the pipeline.
  const columnMap = new Map<string, ESQLColumnData>(previousColumns.map((c) => [c.name, c]));

  for (const name of getDenseVectorColumnNames(denseVectorCommand)) {
    columnMap.set(name, { name, type: 'dense_vector' as const, userDefined: false });
  }

  return [...columnMap.values()];
};
