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

export const TS_INFO_FIELDS: ESQLColumnData[] = [
  {
    name: 'metric_name',
    type: 'keyword',
    userDefined: false,
  },
  {
    name: 'data_stream',
    type: 'keyword',
    userDefined: false,
  },
  {
    name: 'unit',
    type: 'keyword',
    userDefined: false,
  },
  {
    name: 'metric_type',
    type: 'keyword',
    userDefined: false,
  },
  {
    name: 'field_type',
    type: 'keyword',
    userDefined: false,
  },
  {
    name: 'dimension_fields',
    type: 'keyword',
    userDefined: false,
  },
  {
    name: 'dimensions',
    type: 'keyword',
    userDefined: false,
  },
];

export const columnsAfter = (
  _command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  _query: string
): ESQLColumnData[] => {
  return [...previousColumns, ...TS_INFO_FIELDS];
};
