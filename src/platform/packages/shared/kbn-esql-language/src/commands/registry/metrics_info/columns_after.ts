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
import type { SupportedDataType } from '../../definitions/types';

export const METRICS_INFO_COLUMNS: Array<{ name: string; type: SupportedDataType }> = [
  { name: 'metric_name', type: 'keyword' },
  { name: 'data_stream', type: 'keyword' },
  { name: 'unit', type: 'keyword' },
  { name: 'metric_type', type: 'keyword' },
  { name: 'field_type', type: 'keyword' },
  { name: 'dimension_fields', type: 'keyword' },
];

export const columnsAfter = (
  _command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  _query: string
): ESQLColumnData[] => {
  const newColumns: ESQLColumnData[] = METRICS_INFO_COLUMNS.map((column) => ({
    ...column,
    userDefined: false,
  }));
  return [...previousColumns, ...newColumns];
};
