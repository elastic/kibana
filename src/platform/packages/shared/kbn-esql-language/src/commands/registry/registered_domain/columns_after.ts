/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { LeafPrinter } from '@elastic/esql';
import type { ESQLCommand, ESQLColumn } from '@elastic/esql/types';
import type { SupportedDataType } from '../../definitions/types';
import type { ESQLColumnData } from '../types';

interface ESQLAstRegisteredDomainCommandLike extends ESQLCommand {
  targetField: ESQLColumn;
}

export const REGISTERED_DOMAIN_COLUMNS: Array<{ suffix: string; type: SupportedDataType }> = [
  { suffix: 'domain', type: 'keyword' },
  { suffix: 'registered_domain', type: 'keyword' },
  { suffix: 'top_level_domain', type: 'keyword' },
  { suffix: 'subdomain', type: 'keyword' },
];

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[]
): ESQLColumnData[] => {
  const { targetField } = command as ESQLAstRegisteredDomainCommandLike;

  if (!targetField) {
    return previousColumns;
  }

  const prefix = LeafPrinter.column(targetField);

  const newColumns: ESQLColumnData[] = REGISTERED_DOMAIN_COLUMNS.map(({ suffix, type }) => ({
    name: `${prefix}.${suffix}`,
    type,
    userDefined: false,
  }));

  return [...previousColumns, ...newColumns];
};
