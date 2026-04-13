/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { LeafPrinter } from '@elastic/esql';
import type { ESQLCommand, ESQLAstUriPartsCommand } from '@elastic/esql/types';
import type { SupportedDataType } from '../../definitions/types';
import type { ESQLColumnData } from '../types';

export const URI_PARTS_COLUMNS: Array<{ suffix: string; type: SupportedDataType }> = [
  { suffix: 'domain', type: 'keyword' },
  { suffix: 'fragment', type: 'keyword' },
  { suffix: 'path', type: 'keyword' },
  { suffix: 'extension', type: 'keyword' },
  { suffix: 'port', type: 'integer' },
  { suffix: 'query', type: 'keyword' },
  { suffix: 'scheme', type: 'keyword' },
  { suffix: 'user_info', type: 'keyword' },
  { suffix: 'username', type: 'keyword' },
  { suffix: 'password', type: 'keyword' },
];

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[]
): ESQLColumnData[] => {
  const { targetField } = command as ESQLAstUriPartsCommand;

  if (!targetField) {
    return previousColumns;
  }

  const prefix = LeafPrinter.column(targetField);

  const newColumns: ESQLColumnData[] = URI_PARTS_COLUMNS.map(({ suffix, type }) => ({
    name: `${prefix}.${suffix}`,
    type,
    userDefined: false,
  }));

  return [...previousColumns, ...newColumns];
};
