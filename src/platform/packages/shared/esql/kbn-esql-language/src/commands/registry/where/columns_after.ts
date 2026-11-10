/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { getFullTextTargets, isTextColumn } from '../../definitions/utils/full_text_match';

/**
 * WHERE filters rows without changing the columns, but it marks the ones its positive full-text
 * conditions target, so a later command can reuse them.
 */
export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[]
): ESQLColumnData[] => {
  const { fields, all } = getFullTextTargets(command.args[0]);

  if (!all && fields.size === 0) {
    return previousColumns;
  }

  return previousColumns.map((column) => {
    // A condition that names no field applies to whichever text columns exist later, so every
    // column carries it: it then survives as long as any column does, even if the text columns
    // of this point are removed and new ones created.
    if (all) {
      return { ...column, fullTextMatch: 'all' };
    }

    return isTextColumn(column) && fields.has(column.name) && column.fullTextMatch !== 'all'
      ? { ...column, fullTextMatch: 'field' }
      : column;
  });
};
