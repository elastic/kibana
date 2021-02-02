/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isEmpty } from 'lodash';
import { IAggConfigs } from '../aggs';
import { tabifyGetColumns } from './get_columns';

import { TabbedResponseWriterOptions, TabbedAggColumn, TabbedAggRow, TabbedTable } from './types';

interface BufferColumn {
  id: string;
  value: string | number;
}

/**
 * Writer class that collects information about an aggregation response and
 * produces a table, or a series of tables.
 */
export class TabbedAggResponseWriter {
  columns: TabbedAggColumn[];
  rows: TabbedAggRow[] = [];
  bucketBuffer: BufferColumn[] = [];
  metricBuffer: BufferColumn[] = [];

  private readonly partialRows: boolean;

  /**
   * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
   * @param {boolean} metricsAtAllLevels - setting to true will produce metrics for every bucket
   * @param {boolean} partialRows - setting to true will not remove rows with missing values
   */
  constructor(
    aggs: IAggConfigs,
    { metricsAtAllLevels = false, partialRows = false }: Partial<TabbedResponseWriterOptions>
  ) {
    this.partialRows = partialRows;

    this.columns = tabifyGetColumns(aggs.getResponseAggs(), !metricsAtAllLevels);
    this.rows = [];
  }

  /**
   * Create a new row by reading the row buffer and bucketBuffer
   */
  row() {
    const rowBuffer: TabbedAggRow = {};

    this.bucketBuffer.forEach((bucket) => {
      rowBuffer[bucket.id] = bucket.value;
    });

    this.metricBuffer.forEach((metric) => {
      rowBuffer[metric.id] = metric.value;
    });

    const isPartialRow = !this.columns.every((column) => rowBuffer.hasOwnProperty(column.id));
    const removePartial = isPartialRow && !this.partialRows;
    if (!isEmpty(rowBuffer) && !removePartial) {
      this.rows.push(rowBuffer);
    }
  }

  response(): TabbedTable {
    return {
      columns: this.columns,
      rows: this.rows,
    };
  }
}
