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
import type { ESQLCommandSummary } from '../types';
import { REGISTERED_DOMAIN_COLUMNS } from './columns_after';

interface ESQLAstRegisteredDomainCommandLike extends ESQLCommand {
  targetField: ESQLColumn;
}

export const summary = (command: ESQLCommand): ESQLCommandSummary => {
  const { targetField } = command as ESQLAstRegisteredDomainCommandLike;

  if (!targetField) {
    return { newColumns: new Set() };
  }

  const prefix = LeafPrinter.column(targetField);
  const newColumns = REGISTERED_DOMAIN_COLUMNS.map(({ suffix }) => `${prefix}.${suffix}`);

  return { newColumns: new Set(newColumns) };
};
