/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';

export type DataStreamType = 'logs' | 'metrics' | 'traces' | undefined;

export function getDataStreamType(record: DataTableRecord): DataStreamType {
  const types = getFieldValue(record, 'data_stream.type') as string[];
  if (types.includes('logs')) return 'logs';
  if (types.includes('metrics')) return 'metrics';
  if (types.includes('traces')) return 'traces';
  return undefined;
}
