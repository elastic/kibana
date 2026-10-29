/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { LatencyMap } from './src/components/latency_map';
export type { LatencyMapProps } from './src/components/latency_map';
export { selectionToEsqlCondition } from './src/selection/to_esql';
export { TRACES_INDEX_PATTERN } from './src/query/fields';
export type {
  DurationStats,
  EsqlTable,
  LatencyMapCell,
  LatencyMapSelection,
  LatencyMapUnit,
  RunEsql,
  TraceSource,
} from './src/types';
