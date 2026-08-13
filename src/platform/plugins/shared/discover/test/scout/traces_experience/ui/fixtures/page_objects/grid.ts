/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const TRACE_COLUMNS = [
  '@timestamp',
  'service.name',
  'transaction.name',
  'span.name',
  'transaction.duration.us',
  'span.duration.us',
  'event.outcome',
];

export interface TracesGrid {
  readonly expectedColumns: readonly string[];
  readonly profileSpecificColumns: readonly string[];
}

export function createTracesGrid(): TracesGrid {
  return {
    expectedColumns: TRACE_COLUMNS,
    profileSpecificColumns: TRACE_COLUMNS.filter((col) => col !== '@timestamp'),
  };
}
