/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import uniqBy from 'lodash/uniqBy';
import type { ESQLCommand } from '../../../types';
import { columnsAfter as columnsAfterStats } from '../stats/columns_after';
import type { ESQLColumnData, UnmappedFieldsStrategy } from '../types';
import type { IAdditionalFields } from '../registry';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string,
  additionalFields: IAdditionalFields,
  unmappedFieldsStrategy: UnmappedFieldsStrategy
) => {
  const newColumns = columnsAfterStats(
    command,
    previousColumns,
    query,
    additionalFields,
    unmappedFieldsStrategy
  );

  return uniqBy([...newColumns, ...previousColumns], 'name');
};
