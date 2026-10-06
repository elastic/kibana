/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';
import type { IAggConfigs } from '../aggs';
import type { TabbedResponseWriterOptions, TabbedAggColumn, TabbedAggRow } from './types';
interface BufferColumn {
  id: string;
  value: string | number;
}
/**
 * Writer class that collects information about an aggregation response and
 * produces a table, or a series of tables.
 */
export declare class TabbedAggResponseWriter {
  columns: TabbedAggColumn[];
  rows: TabbedAggRow[];
  bucketBuffer: BufferColumn[];
  metricBuffer: BufferColumn[];
  private readonly partialRows;
  private readonly params;
  /**
   * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
   * @param {boolean} metricsAtAllLevels - setting to true will produce metrics for every bucket
   * @param {boolean} partialRows - setting to true will not remove rows with missing values
   */
  constructor(aggs: IAggConfigs, params: Partial<TabbedResponseWriterOptions>);
  /**
   * Create a new row by reading the row buffer and bucketBuffer
   */
  row(): void;
  response(): Datatable;
}
export {};
