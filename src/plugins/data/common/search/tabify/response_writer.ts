/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common/expression_types/specs';
import { IAggConfigs } from '../aggs';
import { tabifyGetColumns } from './get_columns';

import type { TabbedResponseWriterOptions, TabbedAggColumn, TabbedAggRow } from './types';

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
  private readonly params: Partial<TabbedResponseWriterOptions>;

  /**
   * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
   * @param {boolean} metricsAtAllLevels - setting to true will produce metrics for every bucket
   * @param {boolean} partialRows - setting to true will not remove rows with missing values
   */
  constructor(aggs: IAggConfigs, params: Partial<TabbedResponseWriterOptions>) {
    this.partialRows = params.partialRows || false;
    this.params = params;

    this.columns = tabifyGetColumns(aggs.getResponseAggs(), !params.metricsAtAllLevels);
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

  response(): Datatable {
    return {
      type: 'datatable',
      columns: this.columns.map((column) => {
        const cleanedColumn: DatatableColumn = {
          id: column.id,
          name: column.name,
          meta: {
            type:
              column.aggConfig.type.valueType || column.aggConfig.params.field?.type || 'number',
            field: column.aggConfig.params.field?.name,
            index: column.aggConfig.getIndexPattern()?.title,
            params: column.aggConfig.toSerializedFieldFormat(),
            source: 'esaggs',
            sourceParams: {
              hasPrecisionError: Boolean(column.hasPrecisionError),
              indexPatternId: column.aggConfig.getIndexPattern()?.id,
              appliedTimeRange:
                column.aggConfig.params.field?.name &&
                this.params.timeRange &&
                this.params.timeRange.timeFields &&
                this.params.timeRange.timeFields.includes(column.aggConfig.params.field?.name)
                  ? {
                      from: this.params.timeRange?.from?.toISOString(),
                      to: this.params.timeRange?.to?.toISOString(),
                    }
                  : undefined,
              ...column.aggConfig.serialize(),
            },
          },
        };
        return cleanedColumn;
      }),
      rows: this.rows,
    };
  }
}
